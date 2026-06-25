export interface ILlmProvider {
  processEnquiry(enquiry: string): Promise<string>;
}