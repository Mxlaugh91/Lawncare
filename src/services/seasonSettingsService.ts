import { 
  doc, 
  getDoc, 
  setDoc, 
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { SeasonSettings } from '@/types';

const SEASON_SETTINGS_COLLECTION = 'season_settings';

/** Deterministic document id so settings can never be duplicated per year. */
export const getSeasonSettingsDocId = (year: number) => `season-${year}`;

export const DEFAULT_SEASON_SETTINGS = {
  startWeek: 18,
  endWeek: 42,
  defaultFrequency: 2,
} as const;

/** Error type so validation messages can be surfaced to the UI. */
export class SeasonSettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeasonSettingsValidationError';
  }
}

/**
 * Validates season settings against the constraints enforced by the security
 * rules: both weeks are valid ISO week numbers (1-53) and startWeek must be
 * before endWeek, with a positive default frequency.
 */
export const validateSeasonSettings = (settings: {
  startWeek?: number;
  endWeek?: number;
  defaultFrequency?: number;
}): void => {
  const { startWeek, endWeek, defaultFrequency } = settings;

  const isValidWeek = (week: number | undefined): week is number =>
    typeof week === 'number' && Number.isInteger(week) && week >= 1 && week <= 53;

  if (startWeek !== undefined && !isValidWeek(startWeek)) {
    throw new SeasonSettingsValidationError('Sesongstart må være et gyldig ukenummer (1-53)');
  }

  if (endWeek !== undefined && !isValidWeek(endWeek)) {
    throw new SeasonSettingsValidationError('Sesongslutt må være et gyldig ukenummer (1-53)');
  }

  if (startWeek !== undefined && endWeek !== undefined && startWeek >= endWeek) {
    throw new SeasonSettingsValidationError('Sesongstart må være før sesongslutt');
  }

  if (defaultFrequency !== undefined && (!Number.isInteger(defaultFrequency) || defaultFrequency < 1)) {
    throw new SeasonSettingsValidationError('Standard vedlikeholdsfrekvens må være et positivt heltall');
  }
};

export const getSeasonSettings = async () => {
  try {
    const currentYear = new Date().getFullYear();
    const docRef = doc(db, SEASON_SETTINGS_COLLECTION, getSeasonSettingsDocId(currentYear));
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as SeasonSettings;
    }

    // Return default settings if none exist
    return {
      id: getSeasonSettingsDocId(currentYear),
      year: currentYear,
      ...DEFAULT_SEASON_SETTINGS,
      updatedAt: Timestamp.now()
    } as SeasonSettings;
  } catch (error) {
    console.error('Error getting season settings:', error);
    throw new Error('Kunne ikke hente sesonginnstillinger');
  }
};

export const updateSeasonSettings = async (settings: Partial<SeasonSettings>) => {
  try {
    const currentYear = new Date().getFullYear();
    const docRef = doc(db, SEASON_SETTINGS_COLLECTION, getSeasonSettingsDocId(currentYear));

    const existingDoc = await getDoc(docRef);
    const existing = existingDoc.exists() ? (existingDoc.data() as Partial<SeasonSettings>) : {};

    // Merge with existing/default values and validate the final document so a
    // partial update can never persist an invalid combination.
    const merged = {
      startWeek: settings.startWeek ?? existing.startWeek ?? DEFAULT_SEASON_SETTINGS.startWeek,
      endWeek: settings.endWeek ?? existing.endWeek ?? DEFAULT_SEASON_SETTINGS.endWeek,
      defaultFrequency: settings.defaultFrequency ?? existing.defaultFrequency ?? DEFAULT_SEASON_SETTINGS.defaultFrequency,
    };

    validateSeasonSettings(merged);

    await setDoc(docRef, {
      year: currentYear,
      ...merged,
      updatedAt: serverTimestamp()
    });

    // Get and return the updated settings
    const updatedDoc = await getDoc(docRef);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as SeasonSettings;
  } catch (error) {
    console.error('Error updating season settings:', error);

    // Keep validation messages actionable for the settings form.
    if (error instanceof SeasonSettingsValidationError) {
      throw error;
    }

    throw new Error('Kunne ikke oppdatere sesonginnstillinger');
  }
};
