// This file is machine-generated - edit at your own risk!

'use server';

/**
 * @fileOverview Bill summary AI agent.
 *
 * - generateBillSummary - A function that handles the bill summary generation process.
 * - GenerateBillSummaryInput - The input type for the generateBillSummary function.
 * - GenerateBillSummaryOutput - The return type for the generateBillSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBillSummaryInputSchema = z.object({
  tenantName: z.string().describe('The name of the tenant.'),
  billDate: z.string().describe('The date of the bill.'),
  dueDate: z.string().describe('The due date of the bill.'),
  currentReading: z.number().describe('The current meter reading.'),
  previousReading: z.number().describe('The previous meter reading.'),
  unitsConsumed: z.number().describe('The number of units consumed.'),
  unitRate: z.number().describe('The rate per unit of electricity.'),
  previousDue: z.number().describe('The previous due amount.'),
  electricityCharges: z.number().describe('The total electricity charges.'),
  waterCharges: z.number().describe('The water charges.'),
  penalty: z.number().describe('The penalty charges.'),
  totalAmount: z.number().describe('The total amount due.'),
  applyWaterCharges: z.boolean().describe('Whether to apply water charges to the bill.'),
});
export type GenerateBillSummaryInput = z.infer<typeof GenerateBillSummaryInputSchema>;

const GenerateBillSummaryOutputSchema = z.object({
  englishBill: z.string().describe('The bill summary in English.'),
  hindiBill: z.string().describe('The bill summary in Hindi.'),
});
export type GenerateBillSummaryOutput = z.infer<typeof GenerateBillSummaryOutputSchema>;

export async function generateBillSummary(input: GenerateBillSummaryInput): Promise<GenerateBillSummaryOutput> {
  return generateBillSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBillSummaryPrompt',
  input: {schema: GenerateBillSummaryInputSchema},
  output: {schema: GenerateBillSummaryOutputSchema},
  prompt: `You are a billing assistant that generates bill summaries in both English and Hindi based on the provided format.

  Generate a bill for Tenant: {{{tenantName}}}
  
  English format:
  ╔═════════════╗
     *Electric and Water Bill*
  ╚═════════════╝
  
  📅Bill Date: {{{billDate}}}📅
  *📅Due Date: {{{dueDate}}}📅*
  
  *⚡️ELECTRICITY READING:-⚡️*
  Current Meter Reading : *{{{currentReading}}} unit*
  Previous Month Reading : *{{{previousReading}}} unit*
  *Unit consumed : {{{unitsConsumed}}} unit*
  
  *1 Unit Rate*: *₹{{{unitRate}}}*
  *Previous Due (PD)*:*₹{{{previousDue}}}*
  
  *⚡️ELECTRICITY CHARGES💰 ↓*
  = Unit consumed × 1 Unit Rate + (PD)
  = {{{unitsConsumed}}} unit × ₹{{{unitRate}}} + ₹{{{previousDue}}}
  = *₹{{{electricityCharges}}}*
  
  {{#if applyWaterCharges}}*💧WATER CHARGES💧 = ₹{{{waterCharges}}}*
  {{/if}}*🚨Penalty🚨 = ₹{{{penalty}}}*
  
  *💰TOTAL AMOUNT💰 ↓*
  = Electricity charges{{#if applyWaterCharges}} + Water charges{{/if}} + Penalty
  = ₹{{{electricityCharges}}}{{#if applyWaterCharges}} + ₹{{{waterCharges}}}{{/if}} + ₹{{{penalty}}}
  = *₹{{{totalAmount}}}*
  
  📞 For any queries or concerns, please contact: 9826700587.
  
  🙏 Thank you. 🙏

  
  Hindi format:
  ╔═════════════╗
     *बिजली और पानी का बिल*
  ╚═════════════╝
  
  📅बिल दिनांक: {{{billDate}}}📅
  *📅आखरी तारीख: {{{dueDate}}}📅*
  
  *⚡️बिजली रीडिंग्:-⚡️*
  वर्तमान मीटर की रीडिंग् : *{{{currentReading}}} यूनिट*
  पिछले महीने की रीडिंग् : *{{{previousReading}}} यूनिट*
  *उपभोक्त यूनिट : {{{unitsConsumed}}} यूनिट*
  
  *1 यूनिट दर*: *₹{{{unitRate}}}*
  *पिछला बकाया (पि.ब)*:*₹{{{previousDue}}}*
  
  *⚡️कुल बिजली शुल्क💰 ↓*
  = उपभोक्त यूनिट × 1 यूनिट दर + (पि.ब)
  = {{{unitsConsumed}}} यूनिट × ₹{{{unitRate}}} + ₹{{{previousDue}}}
  = *₹{{{electricityCharges}}}*
  
  {{#if applyWaterCharges}}*💧पानी शुल्क💧 = ₹{{{waterCharges}}}*
  {{/if}}*🚨पेनल्टी🚨 = ₹{{{penalty}}}*
  
  *💰कुल रकम💰 ↓*
  = कुल बिजली शुल्क{{#if applyWaterCharges}} + पानी शुल्क{{/if}} + पेनल्टी
  = ₹{{{electricityCharges}}}{{#if applyWaterCharges}} + ₹{{{waterCharges}}}{{/if}} + ₹{{{penalty}}}
  = *₹{{{totalAmount}}}*
  
  📞 किसी भी प्रश्न या समस्याओं के लिए, कृपया संपर्क करें: 9826700587.
  
  🙏 धन्यवाद. 🙏

  Return the bills in the 'englishBill' and 'hindiBill' fields. Do not include the tenant name in the bill text itself.
  `,
});

const generateBillSummaryFlow = ai.defineFlow(
  {
    name: 'generateBillSummaryFlow',
    inputSchema: GenerateBillSummaryInputSchema,
    outputSchema: GenerateBillSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
