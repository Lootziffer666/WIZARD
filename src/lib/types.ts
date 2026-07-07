export type AssetType =
  | "StaticMesh"
  | "SkeletalMesh"
  | "Material"
  | "Texture"
  | "Blueprint"
  | "Animation"
  | "Sound"
  | "Particle"
  | "Other";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  path: string;
  tags: string[];
  thumbnail?: string;
  description?: string;
  polyCount?: number;
  sizeMb?: number;
}

export type Catalog = Asset[];

export interface SearchParams {
  query?: string;
  type?: AssetType | "";
  tags?: string[];
  maxPoly?: number;
  limit?: number;
}
