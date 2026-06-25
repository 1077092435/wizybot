<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# Wizybot AI Sales Agent Assessment

This project implements an AI-powered sales agent using NestJS. The agent can search for products in a catalog and perform currency conversions to assist customers with their enquiries.

## Design Decisions

- **LLM Provider (Ollama):** We utilized **Ollama** running the `llama3` model locally. This decision was made to ensure data privacy, eliminate recurring subscription costs associated with OpenAI, and remove external dependencies for core functionality. The architecture is modular, allowing easy replacement with OpenAI or any other LLM provider in the future.
- **Currency Service (FreeCurrencyAPI):** We integrated **FreeCurrencyAPI** for real-time exchange rates. This was selected as a cost-effective alternative to Open Exchange Rates while providing the necessary reliability for the requested currency conversion features.

## Prerequisites

- Node.js (v18+)
- [Ollama](https://ollama.com/) installed and running locally.
- Run `ollama pull llama3` to download the required model.
- A valid API Key from [FreeCurrencyAPI](https://freecurrencyapi.com/).

## Environment Setup

Create a `.env` file in the root directory and add your API key:

```env
CURRENCY_API_KEY=your_api_key_here

## Project Setup

npm install

## Run the project

npm run start:dev

## Api Documentation


Once the project is running, you can access the Swagger UI for testing the endpoints at:
http://localhost:3000/api

Test Cases
You can validate the implementation with the following queries via the Swagger interface:

"I am looking for a phone"

"I am looking for a present for my dad"

"How much does a watch cost?"

"What is the price of the watch in Euros?"

"How many Canadian Dollars are 350 Euros"


## Project Structure

src/chat/providers/: Contains the LLM integration logic (OllamaProvider) and external services (CurrencyService).

src/chat/dto/: Data Transfer Objects for request validation.

src/chat/currency-intent.util.ts: Deterministic utility for intent detection.

