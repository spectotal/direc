export interface SpecDocumentPairArtifactPayload {
  changeId: string;
  changeSpecPath: string;
  stableSpecPath: string;
  changeContents: string;
  stableContents: string | null;
}
