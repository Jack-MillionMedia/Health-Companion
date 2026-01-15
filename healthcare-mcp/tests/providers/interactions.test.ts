import { describe, it, expect } from 'vitest';
import { parseSeverityFromText } from '../../src/providers/drug-interactions';

describe('parseSeverityFromText', () => {
    it('should identify contraindicated terms', () => {
        expect(parseSeverityFromText('This drug is contraindicated in patients...')).toBe('contraindicated');
        expect(parseSeverityFromText('Do not use with...')).toBe('contraindicated');
        expect(parseSeverityFromText('MUST NOT be used...')).toBe('contraindicated');
    });

    it('should identify major interactions', () => {
        expect(parseSeverityFromText('Serious risk of bleeding...')).toBe('major');
        expect(parseSeverityFromText('Avoid concomitant use...')).toBe('major');
        expect(parseSeverityFromText('Life-threatening arrhythmia...')).toBe('major');
    });

    it('should identify moderate interactions', () => {
        expect(parseSeverityFromText('Use with caution...')).toBe('moderate');
        expect(parseSeverityFromText('Monitor patients...')).toBe('moderate');
        expect(parseSeverityFromText('May increase levels...')).toBe('moderate');
    });

    it('should identify minor interactions', () => {
        expect(parseSeverityFromText('Minor interactions possible...')).toBe('minor');
        expect(parseSeverityFromText('Unlikely to be significant...')).toBe('minor');
    });

    it('should return unknown for neutral text', () => {
        expect(parseSeverityFromText('No significant findings reported.')).toBe('unknown');
        expect(parseSeverityFromText('')).toBe('unknown');
    });

    it('should prioritize higher severity keywords', () => {
        // "Contraindicated" > "Major"
        expect(parseSeverityFromText('Contraindicated. Serious risk of death.')).toBe('contraindicated');

        // "Serious" (major) > "Caution" (moderate)
        expect(parseSeverityFromText('Serious risk, use with caution.')).toBe('major');

        // "Caution" (moderate) > "Minor"
        expect(parseSeverityFromText('Use with caution, minor side effects.')).toBe('moderate');
    });
});
