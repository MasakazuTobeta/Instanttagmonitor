export interface DetectionResult {
  id: number;
  corners: [number, number][];
  tagType?: string;
  family?: string;
}

export type TagType = 'AprilTag' | 'AprilTag2' | 'AprilTag3' | 'ArUco';

export const TAG_FAMILIES: Record<TagType, string[]> = {
  AprilTag: [
    'tag36h11',
    'tag25h9',
    'tag16h5',
    'tagCircle21h7',
    'tagCircle49h12',
    'tagStandard41h12',
    'tagStandard52h13'
  ],
  AprilTag2: ['tag36h11', 'tag25h9', 'tag16h5'],
  AprilTag3: ['tag36h11', 'tag25h9', 'tag16h5'],
  ArUco: [
    'DICT_4X4_50',
    'DICT_4X4_100',
    'DICT_4X4_250',
    'DICT_4X4_1000',
    'DICT_5X5_50',
    'DICT_5X5_100',
    'DICT_5X5_250',
    'DICT_5X5_1000',
    'DICT_6X6_50',
    'DICT_6X6_100',
    'DICT_6X6_250',
    'DICT_6X6_1000',
    'DICT_7X7_50',
    'DICT_7X7_100',
    'DICT_7X7_250',
    'DICT_7X7_1000'
  ]
};

export interface DetectionSettings {
  tagType: TagType | 'auto';
  family: string | 'auto';
}
