// =============================================
// StochFin API: Upload & Process Financial Documents
// Uses Gemini multimodal to handle PDFs directly
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getGeminiModel } from '@/lib/ai/gemini';

// =============================================
// Types
// =============================================

interface ExtractedFinancials {
    companyName: string | null;
    ticker: string | null;
    currency: string;
    years: string[];
    incomeStatement: Record<string, Record<string, number | null>>;
    balanceSheet: Record<string, Record<string, number | null>>;
    cashFlow: Record<string, Record<string, number | null>>;
    rawText?: string;
    warnings: string[];
}

// =============================================
// Gemini Prompt for Financial Extraction
// =============================================

const FINANCIAL_EXTRACTION_PROMPT = `You are an expert financial analyst AI. Extract financial data from this document.

Extract:
1. Company name and currency (PLN for Polish, USD for American companies)
2. Years of data (most recent 3 years)

For each year extract:
- Income Statement: revenue, costOfRevenue, grossProfit, ebitda, depreciation, ebit, interestExpense, netIncome
- Balance Sheet: totalAssets, currentAssets, cash, receivables, inventory, totalLiabilities, currentLiabilities, longTermDebt, totalEquity, retainedEarnings
- Cash Flow: operatingCF, capex (positive number), freeCashFlow, dividendsPaid

RULES:
- Convert thousands to actual values (multiply by 1000)
- Convert millions to actual values (multiply by 1000000)
- Return null for missing values
- Focus on 3 most recent years

Respond ONLY with valid JSON:
{
    "companyName": "Company Name",
    "ticker": "TICKER or null",
    "currency": "PLN",
    "years": ["2024", "2023", "2022"],
    "incomeStatement": {
        "2024": { "revenue": 1000000, "ebitda": 200000, "netIncome": 100000 }
    },
    "balanceSheet": {
        "2024": { "totalAssets": 5000000, "totalEquity": 2000000 }
    },
    "cashFlow": {
        "2024": { "operatingCF": 250000, "capex": 50000 }
    },
    "warnings": ["Notes about missing data"]
}`;

// =============================================
// Helper Functions
// =============================================

function parseExcel(buffer: ArrayBuffer): string {
    const workbook = XLSX.read(buffer, { type: 'array' });
    let fullText = '';

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        fullText += `\n=== ${sheetName} ===\n${csv}\n`;
    }

    return fullText;
}

async function extractFromPDF(buffer: ArrayBuffer): Promise<ExtractedFinancials> {
    const model = getGeminiModel('gemini-2.0-flash');

    // Convert buffer to base64
    const base64Data = Buffer.from(buffer).toString('base64');

    try {
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: base64Data
                }
            },
            { text: FINANCIAL_EXTRACTION_PROMPT }
        ]);

        const response = result.response.text();

        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON in AI response');
        }

        return JSON.parse(jsonMatch[0]) as ExtractedFinancials;
    } catch (error) {
        console.error('PDF extraction failed:', error);
        return {
            companyName: null,
            ticker: null,
            currency: 'PLN',
            years: [],
            incomeStatement: {},
            balanceSheet: {},
            cashFlow: {},
            warnings: ['PDF extraction failed. Please try Excel or enter data manually.']
        };
    }
}

async function extractFromText(text: string): Promise<ExtractedFinancials> {
    const model = getGeminiModel('gemini-2.0-flash');

    // Truncate if too long
    const maxLength = 25000;
    const truncatedText = text.length > maxLength
        ? text.substring(0, maxLength) + '\n... [truncated]'
        : text;

    try {
        const result = await model.generateContent([
            { text: FINANCIAL_EXTRACTION_PROMPT + '\n\nDOCUMENT:\n' + truncatedText }
        ]);

        const response = result.response.text();

        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON in AI response');
        }

        const parsed = JSON.parse(jsonMatch[0]) as ExtractedFinancials;
        parsed.rawText = truncatedText.substring(0, 300);
        return parsed;
    } catch (error) {
        console.error('Text extraction failed:', error);
        return {
            companyName: null,
            ticker: null,
            currency: 'PLN',
            years: [],
            incomeStatement: {},
            balanceSheet: {},
            cashFlow: {},
            rawText: truncatedText.substring(0, 300),
            warnings: ['Extraction failed. Please enter data manually.']
        };
    }
}

// =============================================
// API Route Handler
// =============================================

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file uploaded' },
                { status: 400 }
            );
        }

        // Check file size (20MB limit)
        const MAX_SIZE = 20 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { success: false, error: 'File too large. Maximum 20MB.' },
                { status: 400 }
            );
        }

        const fileName = file.name.toLowerCase();
        const buffer = await file.arrayBuffer();

        let financials: ExtractedFinancials;

        // Process based on file type
        if (fileName.endsWith('.pdf')) {
            // Use Gemini multimodal for PDF
            financials = await extractFromPDF(buffer);
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            // Parse Excel to text, then extract
            const text = parseExcel(buffer);
            financials = await extractFromText(text);
        } else if (fileName.endsWith('.csv')) {
            // Decode CSV and extract
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(buffer);
            financials = await extractFromText(text);
        } else {
            return NextResponse.json(
                { success: false, error: 'Unsupported file type. Use PDF, XLSX, XLS, or CSV.' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            data: financials
        });

    } catch (error) {
        console.error('Upload processing error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to process file'
            },
            { status: 500 }
        );
    }
}
