export type GuideBlock = {
  type: "heading" | "paragraph" | "image" | "audio" | "video";
  text?: string;
  url?: string;
};

export type Guide = {
  id: string;
  user_id: string;
  title: string;
  content: GuideBlock[];
  published: boolean;
  created_at: string;
  updated_at?: string;
};

export type CreateGuideDTO = {
  title: string;
  content: GuideBlock[];
  published: boolean;
};

export type UpdateGuideDTO = {
  title: string;
  content: GuideBlock[];
  published: boolean;
};