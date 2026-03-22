export interface ProjectMetadata {
  description?: string;
  coordinates?: string;
  countryFlag?: string;
  photoUrl?: string;
  pdfName?: string;
  satelliteUrl?: string;
  dateIssued?: string;
}

export function encodeMetadata(fields: ProjectMetadata): string {
  return JSON.stringify(fields);
}

export function decodeMetadata(uri: string): ProjectMetadata {
  try {
    return JSON.parse(uri) as ProjectMetadata;
  } catch {
    return {};
  }
}
