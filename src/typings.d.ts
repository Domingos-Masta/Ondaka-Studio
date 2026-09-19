/* SystemJS module definition */
declare const nodeModule: NodeModule;
declare const mammoth: {
  convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: any[] }>;
  extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: any[] }>;
};
interface NodeModule {
  id: string;
}
interface Window {
  process: any;
  require: any;
  api: {
    // existing...
    settings: {
      getAll(): Promise<Partial<import('./app/core/models/app-settings.model').AppSettings>>;
      patch(p: Partial<import('./app/core/models/app-settings.model').AppSettings>): Promise<unknown>;
    };
    onMenuAction(callback: (action: string) => void): () => void;
    secure: {
      encrypt(plain: string): Promise<{ encrypted: boolean; value: string }>;
      decrypt(p: { encrypted: boolean; value: string }): Promise<string>;
    };
  };
}
