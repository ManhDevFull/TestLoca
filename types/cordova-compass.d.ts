interface CompassHeading {
  magneticHeading: number;
  trueHeading: number;
  headingAccuracy: number;
  timestamp: number;
}

interface CompassError {
  code: number;
}

interface CompassOptions {
  frequency?: number;
  filter?: number;
}

interface CompassAPI {
  getCurrentHeading: (
    success: (heading: CompassHeading) => void,
    error?: (error: CompassError) => void,
  ) => void;
  watchHeading: (
    success: (heading: CompassHeading) => void,
    error?: (error: CompassError) => void,
    options?: CompassOptions,
  ) => string;
  clearWatch: (watchId: string) => void;
}

interface Navigator {
  compass?: CompassAPI;
}
