/**
 * Strips internal metadata tags that some providers may leak into model output.
 * These tags are control-plane context and should never be shown to users.
 */
export function cleanModelOutput(text: string): string {
  return text
    .replace(/<current_datetime>[\s\S]*?<\/current_datetime>/g, "")
    .replace(/<system_reminder>[\s\S]*?<\/system_reminder>/g, "")
    .replace(/<sql_tables>[\s\S]*?<\/sql_tables>/g, "")
    .trim();
}
