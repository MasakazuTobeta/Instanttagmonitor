#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "apriltag.h"
#include "common/image_u8.h"
#include "common/zarray.h"
#include "tag16h5.h"
#include "tag25h9.h"
#include "tag36h11.h"
#include "tagCircle21h7.h"
#include "tagCircle49h12.h"
#include "tagStandard41h12.h"
#include "tagStandard52h13.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

#define FAMILY_TAG36H11 (1u << 0)
#define FAMILY_TAG25H9 (1u << 1)
#define FAMILY_TAG16H5 (1u << 2)
#define FAMILY_TAG_CIRCLE21H7 (1u << 3)
#define FAMILY_TAG_CIRCLE49H12 (1u << 4)
#define FAMILY_TAG_STANDARD41H12 (1u << 5)
#define FAMILY_TAG_STANDARD52H13 (1u << 6)
#define FAMILY_MASK_ALL (FAMILY_TAG36H11 | FAMILY_TAG25H9 | FAMILY_TAG16H5 | FAMILY_TAG_CIRCLE21H7 | FAMILY_TAG_CIRCLE49H12 | FAMILY_TAG_STANDARD41H12 | FAMILY_TAG_STANDARD52H13)

typedef struct {
    int size;
    char *data;
} atagjs_result_t;

typedef struct {
    const char *name;
    uint32_t bit;
    apriltag_family_t *(*create_fn)(void);
    void (*destroy_fn)(apriltag_family_t *);
    apriltag_family_t *instance;
} family_entry_t;

typedef struct {
    char *data;
    int length;
    int capacity;
} json_buffer_t;

static family_entry_t g_family_entries[] = {
    {.name = "tag36h11", .bit = FAMILY_TAG36H11, .create_fn = tag36h11_create, .destroy_fn = tag36h11_destroy, .instance = NULL},
    {.name = "tag25h9", .bit = FAMILY_TAG25H9, .create_fn = tag25h9_create, .destroy_fn = tag25h9_destroy, .instance = NULL},
    {.name = "tag16h5", .bit = FAMILY_TAG16H5, .create_fn = tag16h5_create, .destroy_fn = tag16h5_destroy, .instance = NULL},
    {.name = "tagCircle21h7", .bit = FAMILY_TAG_CIRCLE21H7, .create_fn = tagCircle21h7_create, .destroy_fn = tagCircle21h7_destroy, .instance = NULL},
    {.name = "tagCircle49h12", .bit = FAMILY_TAG_CIRCLE49H12, .create_fn = tagCircle49h12_create, .destroy_fn = tagCircle49h12_destroy, .instance = NULL},
    {.name = "tagStandard41h12", .bit = FAMILY_TAG_STANDARD41H12, .create_fn = tagStandard41h12_create, .destroy_fn = tagStandard41h12_destroy, .instance = NULL},
    {.name = "tagStandard52h13", .bit = FAMILY_TAG_STANDARD52H13, .create_fn = tagStandard52h13_create, .destroy_fn = tagStandard52h13_destroy, .instance = NULL},
};

static apriltag_detector_t *g_detector = NULL;
static uint8_t *g_image_buffer = NULL;
static int g_width = 0;
static int g_height = 0;
static int g_stride = 0;
static int g_max_detections = 0;
static uint32_t g_family_mask = FAMILY_MASK_ALL;
static atagjs_result_t g_result = {0, NULL};
static json_buffer_t g_json = {NULL, 0, 0};

static void json_reset(json_buffer_t *buffer)
{
    buffer->length = 0;
    if (buffer->data != NULL) {
        buffer->data[0] = '\0';
    }
}

static void json_destroy(json_buffer_t *buffer)
{
    free(buffer->data);
    buffer->data = NULL;
    buffer->length = 0;
    buffer->capacity = 0;
}

static int json_reserve(json_buffer_t *buffer, int extra)
{
    int required = buffer->length + extra + 1;
    if (required <= buffer->capacity) {
        return 0;
    }

    int next_capacity = buffer->capacity > 0 ? buffer->capacity : 1024;
    while (next_capacity < required) {
        next_capacity *= 2;
    }

    char *next_data = realloc(buffer->data, (size_t) next_capacity);
    if (next_data == NULL) {
        return -1;
    }

    buffer->data = next_data;
    buffer->capacity = next_capacity;
    if (buffer->length == 0) {
        buffer->data[0] = '\0';
    }
    return 0;
}

static int json_appendf(json_buffer_t *buffer, const char *format, ...)
{
    va_list args;
    va_start(args, format);

    va_list args_copy;
    va_copy(args_copy, args);
    int needed = vsnprintf(NULL, 0, format, args_copy);
    va_end(args_copy);

    if (needed < 0 || json_reserve(buffer, needed) != 0) {
        va_end(args);
        return -1;
    }

    vsnprintf(buffer->data + buffer->length, (size_t) (buffer->capacity - buffer->length), format, args);
    va_end(args);

    buffer->length += needed;
    return 0;
}

static int set_result_empty(void)
{
    json_reset(&g_json);
    if (json_appendf(&g_json, "[]") != 0) {
        g_result.size = 0;
        g_result.data = NULL;
        return -1;
    }

    g_result.size = g_json.length;
    g_result.data = g_json.data;
    return 0;
}

static int ensure_family_instances(void)
{
    size_t family_count = sizeof(g_family_entries) / sizeof(g_family_entries[0]);
    for (size_t index = 0; index < family_count; index += 1) {
        family_entry_t *entry = &g_family_entries[index];
        if (entry->instance == NULL) {
            entry->instance = entry->create_fn();
        }

        if (entry->instance == NULL) {
            return -1;
        }
    }

    return 0;
}

static void destroy_family_instances(void)
{
    size_t family_count = sizeof(g_family_entries) / sizeof(g_family_entries[0]);
    for (size_t index = 0; index < family_count; index += 1) {
        family_entry_t *entry = &g_family_entries[index];
        if (entry->instance != NULL) {
            entry->destroy_fn(entry->instance);
            entry->instance = NULL;
        }
    }
}

static int apply_family_mask(uint32_t family_mask)
{
    if (g_detector == NULL) {
        return -1;
    }

    if (family_mask == 0) {
        family_mask = FAMILY_MASK_ALL;
    }

    if (ensure_family_instances() != 0) {
        return -1;
    }

    apriltag_detector_clear_families(g_detector);

    size_t family_count = sizeof(g_family_entries) / sizeof(g_family_entries[0]);
    int enabled = 0;
    for (size_t index = 0; index < family_count; index += 1) {
        family_entry_t *entry = &g_family_entries[index];
        if ((family_mask & entry->bit) == 0) {
            continue;
        }

        apriltag_detector_add_family_bits(g_detector, entry->instance, 1);
        enabled += 1;
    }

    if (enabled == 0) {
        return -1;
    }

    g_family_mask = family_mask;
    return 0;
}

EMSCRIPTEN_KEEPALIVE
int atagjs_init(void)
{
    if (g_detector != NULL) {
        return 0;
    }

    g_detector = apriltag_detector_create();
    if (g_detector == NULL) {
        return -1;
    }

    g_detector->quad_decimate = 2.0f;
    g_detector->quad_sigma = 0.0f;
    g_detector->nthreads = 1;
    g_detector->debug = false;
    g_detector->refine_edges = true;
    g_max_detections = 0;

    return apply_family_mask(FAMILY_MASK_ALL);
}

EMSCRIPTEN_KEEPALIVE
int atagjs_destroy(void)
{
    if (g_detector != NULL) {
        apriltag_detector_destroy(g_detector);
        g_detector = NULL;
    }

    destroy_family_instances();

    free(g_image_buffer);
    g_image_buffer = NULL;
    g_width = 0;
    g_height = 0;
    g_stride = 0;
    g_max_detections = 0;
    g_family_mask = FAMILY_MASK_ALL;
    json_destroy(&g_json);
    g_result.size = 0;
    g_result.data = NULL;

    return 0;
}

EMSCRIPTEN_KEEPALIVE
int atagjs_set_detector_options(float decimate, float sigma, int nthreads, int refine_edges, int max_detections, int return_pose, int return_solutions)
{
    (void) nthreads;
    (void) return_pose;
    (void) return_solutions;

    if (g_detector == NULL) {
        return -1;
    }

    g_detector->quad_decimate = decimate;
    g_detector->quad_sigma = sigma;
    g_detector->nthreads = 1;
    g_detector->refine_edges = refine_edges != 0;
    g_max_detections = max_detections > 0 ? max_detections : 0;

    return 0;
}

EMSCRIPTEN_KEEPALIVE
int atagjs_set_detector_families(uint32_t family_mask)
{
    return apply_family_mask(family_mask);
}

EMSCRIPTEN_KEEPALIVE
uint8_t *atagjs_set_img_buffer(int width, int height, int stride)
{
    int buffer_width = stride > width ? stride : width;

    if (width <= 0 || height <= 0 || stride <= 0) {
        return NULL;
    }

    if (g_image_buffer != NULL && g_width == width && g_height == height && g_stride == stride) {
        return g_image_buffer;
    }

    free(g_image_buffer);
    g_width = width;
    g_height = height;
    g_stride = stride;
    g_image_buffer = calloc((size_t) (height * buffer_width), sizeof(uint8_t));
    return g_image_buffer;
}

EMSCRIPTEN_KEEPALIVE
atagjs_result_t *atagjs_detect(void)
{
    if (g_detector == NULL || g_image_buffer == NULL) {
        set_result_empty();
        return &g_result;
    }

    image_u8_t image = {
        .width = g_width,
        .height = g_height,
        .stride = g_stride,
        .buf = g_image_buffer,
    };

    zarray_t *detections = apriltag_detector_detect(g_detector, &image);
    int count = zarray_size(detections);
    if (g_max_detections > 0 && count > g_max_detections) {
        count = g_max_detections;
    }

    json_reset(&g_json);
    if (json_appendf(&g_json, "[") != 0) {
        apriltag_detections_destroy(detections);
        set_result_empty();
        return &g_result;
    }

    for (int index = 0; index < count; index += 1) {
        apriltag_detection_t *detection = NULL;
        zarray_get(detections, index, &detection);
        if (detection == NULL) {
            continue;
        }

        if (index > 0) {
            json_appendf(&g_json, ",");
        }

        json_appendf(
            &g_json,
            "{\"id\":%d,\"family\":\"%s\",\"hamming\":%d,\"decisionMargin\":%.3f,\"corners\":[{\"x\":%.2f,\"y\":%.2f},{\"x\":%.2f,\"y\":%.2f},{\"x\":%.2f,\"y\":%.2f},{\"x\":%.2f,\"y\":%.2f}],\"center\":{\"x\":%.2f,\"y\":%.2f}}",
            detection->id,
            detection->family != NULL ? detection->family->name : "unknown",
            detection->hamming,
            detection->decision_margin,
            detection->p[0][0],
            detection->p[0][1],
            detection->p[1][0],
            detection->p[1][1],
            detection->p[2][0],
            detection->p[2][1],
            detection->p[3][0],
            detection->p[3][1],
            detection->c[0],
            detection->c[1]
        );
    }

    json_appendf(&g_json, "]");
    apriltag_detections_destroy(detections);

    g_result.size = g_json.length;
    g_result.data = g_json.data;
    return &g_result;
}
