'use server';

/**
 * @fileOverview Translates a bill into a specified language.
 *
 * - translateBill - A function that translates the bill.
 * - TranslateBillInput - The input type for the translateBill function.
 * - TranslateBillOutput - The return type for the translateBill function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateBillInputSchema = z.object({
  billText: z.string().describe('The bill text to translate.'),
  targetLanguage: z.string().describe('The language to translate the bill text into.'),
});
export type TranslateBillInput = z.infer<typeof TranslateBillInputSchema>;

const TranslateBillOutputSchema = z.object({
  translatedBill: z.string().describe('The translated bill text.'),
});
export type TranslateBillOutput = z.infer<typeof TranslateBillOutputSchema>;

export async function translateBill(input: TranslateBillInput): Promise<TranslateBillOutput> {
  return translateBillFlow(input);
}

const translateBillPrompt = ai.definePrompt({
  name: 'translateBillPrompt',
  input: {schema: TranslateBillInputSchema},
  output: {schema: TranslateBillOutputSchema},
  prompt: `Translate the following bill text into {{targetLanguage}}:\n\n{{{billText}}}`,  
});

const translateBillFlow = ai.defineFlow(
  {
    name: 'translateBillFlow',
    inputSchema: TranslateBillInputSchema,
    outputSchema: TranslateBillOutputSchema,
  },
  async input => {
    const {output} = await translateBillPrompt(input);
    return output!;
  }
);
