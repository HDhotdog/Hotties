export interface Label {
  name: string;
}

export interface LabelGroup {
  id: string;
  name: string;
  labels: Label[];
} 