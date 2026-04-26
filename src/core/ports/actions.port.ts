export interface IconPath {
  16?: string;
  48?: string;
  128?: string;
}

export interface ActionsPort {
  setIcon(path: IconPath): Promise<void>;
}