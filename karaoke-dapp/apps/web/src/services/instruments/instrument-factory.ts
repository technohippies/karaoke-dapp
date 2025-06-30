import type { Instrument, InstrumentType } from '../../types/midi.types';
import { PianoInstrument } from './piano-instrument';

/**
 * Factory for creating instrument instances
 * Makes it easy to add new instruments in the future
 */
export class InstrumentFactory {
  static create(type: InstrumentType): Instrument {
    switch (type) {
      case 'piano':
        return new PianoInstrument();
      
      // Future instrument implementations
      case 'bass':
        // TODO: return new BassInstrument();
        console.warn('Bass instrument not implemented, using piano');
        return new PianoInstrument();
        
      case 'drums':
        // TODO: return new DrumsInstrument();
        console.warn('Drums instrument not implemented, using piano');
        return new PianoInstrument();
        
      case 'guitar':
        // TODO: return new GuitarInstrument();
        console.warn('Guitar instrument not implemented, using piano');
        return new PianoInstrument();
        
      case 'strings':
        // TODO: return new StringsInstrument();
        console.warn('Strings instrument not implemented, using piano');
        return new PianoInstrument();
        
      default:
        console.warn(`Unknown instrument type: ${type}, using piano`);
        return new PianoInstrument();
    }
  }
  
  /**
   * Create multiple instruments at once
   */
  static createMultiple(types: InstrumentType[]): Map<InstrumentType, Instrument> {
    const instruments = new Map<InstrumentType, Instrument>();
    
    for (const type of types) {
      instruments.set(type, this.create(type));
    }
    
    return instruments;
  }
  
  /**
   * Get default instrument configuration for common use cases
   */
  static getDefaultConfiguration(): Map<InstrumentType, Instrument> {
    return this.createMultiple(['piano']);
  }
}