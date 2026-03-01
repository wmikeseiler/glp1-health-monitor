export const GLP1_MEDICATIONS = [
  { name: "Ozempic", doses: [0.25, 0.5, 1.0, 2.0], unit: "mg", scheduleDays: 7 },
  { name: "Mounjaro", doses: [2.5, 5, 7.5, 10, 12.5, 15], unit: "mg", scheduleDays: 7 },
  { name: "Wegovy", doses: [0.25, 0.5, 1.0, 1.7, 2.4], unit: "mg", scheduleDays: 7 },
  { name: "Zepbound", doses: [2.5, 5, 7.5, 10, 12.5, 15], unit: "mg", scheduleDays: 7 },
  { name: "Saxenda", doses: [0.6, 1.2, 1.8, 2.4, 3.0], unit: "mg", scheduleDays: 1 },
] as const;

export const INJECTION_SITE_LABELS: Record<string, string> = {
  left_thigh: "Left Thigh",
  right_thigh: "Right Thigh",
  left_abdomen: "Left Abdomen",
  right_abdomen: "Right Abdomen",
  left_arm: "Left Upper Arm",
  right_arm: "Right Upper Arm",
};

export const BP_RANGES = {
  normal: { systolic: [0, 120], diastolic: [0, 80] },
  elevated: { systolic: [120, 130], diastolic: [0, 80] },
  high1: { systolic: [130, 140], diastolic: [80, 90] },
  high2: { systolic: [140, 300], diastolic: [90, 200] },
} as const;
