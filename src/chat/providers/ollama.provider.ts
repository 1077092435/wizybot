import { Injectable, OnModuleInit } from '@nestjs/common';
import { ILlmProvider } from '../interfaces/llm-provider.interface';
import { Product } from '../interfaces/product.interface';
import { detectCurrencyIntent } from './currency-intent.util';
import { CurrencyService } from './Currency.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class OllamaProvider implements ILlmProvider, OnModuleInit {
    private products: Product[] = [];

    private readonly stopWords = new Set([
        'i', 'am', 'is', 'a', 'an', 'the', 'for', 'my', 'how', 'much',
        'does', 'what', 'in', 'of', 'are', 'to', 'looking', 'costs',
        'cost', 'price', 'with', 'and', 'or', 'me', 'find', 'want',
        'need', 'show', 'tell', 'about', 'can', 'you', 'it', 'do',
    ]);

    constructor(private readonly currencyService: CurrencyService) {}

    onModuleInit() {
        this.loadProducts();
    }

    private loadProducts() {
        try {
            const filePath = path.join(process.cwd(), 'products_list.csv');
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split(/\r?\n/).slice(1);

            this.products = lines
                .filter(line => line.trim() !== '')
                .map(line => {
                    const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
                    return {
                        displayTitle: values[0]?.replace(/"/g, '') ?? '',
                        price: values[6] || 'N/A',
                        productType: values[4] || 'General',
                    } as Product;
                });
            console.log(`OllamaProvider: ${this.products.length} productos cargados.`);
        } catch (error) {
            console.error('Error al cargar CSV:', error);
        }
    }

    private extractKeywords(enquiry: string): string[] {
        return enquiry
            .toLowerCase()
            .replace(/[?.,!]/g, '')
            .split(/\s+/)
            .filter(term => term.length > 2 && !this.stopWords.has(term));
    }


    private async inferProductKeywords(enquiry: string): Promise<string[]> {
        const categories = [...new Set(this.products.map(p => p.productType))].slice(0, 30);

        const prompt = `Catálogo de categorías disponibles: ${categories.join(', ')}

            Mensaje del cliente: "${enquiry}"

            Tarea: devuelve SOLO un array JSON (sin texto adicional, sin markdown) con 1 a 4 palabras clave o categorías de producto relevantes para buscar en el catálogo, basándote en lo que el cliente podría estar buscando.
            Ejemplo de formato de respuesta: ["watch", "jewelry"]`;

        try {
            const response = await axios.post('http://localhost:11434/api/generate', {
                model: 'llama3',
                prompt,
                stream: false,
                format: 'json',
            });

            const parsed = JSON.parse(response.data.response);
            if (Array.isArray(parsed)) {
                return parsed.map((k: string) => String(k).toLowerCase());
            }
            return [];
        } catch (error: any) {
            console.error('Error al inferir keywords:', error.message);
            return [];
        }
    }


    private async findRelevantProducts(enquiry: string): Promise<Product[]> {
        const directKeywords = this.extractKeywords(enquiry);

        let relevant = this.products.filter(p =>
            directKeywords.some(
                term =>
                    p.displayTitle.toLowerCase().includes(term) ||
                    p.productType.toLowerCase().includes(term),
            ),
        );

        if (relevant.length === 0) {
            const inferredKeywords = await this.inferProductKeywords(enquiry);
            if (inferredKeywords.length > 0) {
                relevant = this.products.filter(p =>
                    inferredKeywords.some(
                        term =>
                            p.displayTitle.toLowerCase().includes(term) ||
                            p.productType.toLowerCase().includes(term),
                    ),
                );
            }
        }

        return relevant.slice(0, 10);
    }

    private parsePrice(rawPrice: string): { amount: number; currency: string } | null {
        const match = rawPrice.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
        if (!match) return null;
        return { amount: parseFloat(match[1]), currency: 'USD' };
    }

    async processEnquiry(enquiry: string): Promise<string> {
        const currencyIntent = detectCurrencyIntent(enquiry);

        if (currencyIntent?.type === 'convert_amount') {
            const { amount, from, to } = currencyIntent;
            const converted = await this.currencyService.convert(amount!, from!, to!);

            if (converted === null) {
                return `No pude obtener la tasa de cambio de ${from} a ${to} en este momento. Intenta de nuevo más tarde.`;
            }

            return `${amount} ${from} equivalen aproximadamente a ${converted} ${to}.`;
        }

        if (currencyIntent?.type === 'product_price_in_currency') {
            const relevant = await this.findRelevantProducts(currencyIntent.productQuery!);

            if (relevant.length === 0) {
                return `No encontré ningún producto que coincida con "${currencyIntent.productQuery}" en el inventario.`;
            }

            const product = relevant[0];
            const parsed = this.parsePrice(product.price);

            if (!parsed) {
                return `Encontré "${product.displayTitle}" pero no pude leer su precio correctamente.`;
            }

            const converted = await this.currencyService.convert(
                parsed.amount,
                parsed.currency,
                currencyIntent.to!,
            );

            if (converted === null) {
                return `Encontré "${product.displayTitle}" a $${parsed.amount} ${parsed.currency}, pero no pude convertir a ${currencyIntent.to} en este momento.`;
            }

            return `${product.displayTitle} cuesta aproximadamente ${converted} ${currencyIntent.to} (precio original: ${parsed.amount} ${parsed.currency}).`;
        }

        const relevant = await this.findRelevantProducts(enquiry);

        const inventoryContext = relevant.length > 0
            ? relevant.map(p => `- ${p.displayTitle} ($${p.price})`).join('\n')
            : 'Ningún producto encontrado en inventario.';

        const prompt = `Actúa como asistente de ventas. Inventario disponible:
${inventoryContext}

Pregunta del cliente: "${enquiry}"

Si el producto no está en el inventario, dilo claramente y sugiere alternativas del inventario si las hay. Si está, indica su nombre y precio. Sé breve y conversacional. No inventes precios ni productos que no estén en la lista.`;

        try {
            const response = await axios.post('http://localhost:11434/api/generate', {
                model: 'llama3',
                prompt,
                stream: false,
            });
            return response.data.response;
        } catch (error: any) {
            console.error('Error Ollama:', error.message);
            return 'Error al procesar la solicitud.';
        }
    }
}