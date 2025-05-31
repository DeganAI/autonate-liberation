// Core types for the Autonate Liberation Organization

export interface Coordinator {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CoordinatorStatus;
  stats: CoordinatorStats;
  preferences: CoordinatorPreferences;
}

export interface CoordinatorStatus {
  available: boolean;
  onCall: boolean;
  onBreak: boolean;
  lastBreak: Date;
  workingHours: number;
  currentCall?: string;
}

export interface CoordinatorStats {
  callsToday: number;
  callsThisWeek: number;
  hoursWorkedToday: number;
  hoursWorkedThisWeek: number;
  stressLevel: number; // 0-1
  averageCallDuration: number;
  customerSatisfaction: number;
}

export interface CoordinatorPreferences {
  maxCallsPerDay: number;
  preferredBreakTimes: string[];
  specialties: string[];
  vacationDates: DateRange[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  history: ShipmentHistory[];
  preferences: CustomerPreferences;
  emotionalProfile: EmotionalProfile;
}

export interface EmotionalProfile {
  anxietyLevel: number; // 0-1
  trustLevel: number; // 0-1
  communicationStyle: 'direct' | 'detailed' | 'reassuring';
  triggers: string[];
  preferredChannel: 'phone' | 'sms' | 'email';
}

export interface Vehicle {
  make: string;
  model: string;
  year: number;
  vin?: string;
  type: VehicleType;
  condition: VehicleCondition;
  value?: number;
  modifications?: string[];
  specialRequirements?: string[];
}

export enum VehicleType {
  SEDAN = 'sedan',
  SUV = 'suv',
  TRUCK = 'truck',
  VAN = 'van',
  MOTORCYCLE = 'motorcycle',
  CLASSIC = 'classic',
  EXOTIC = 'exotic',
  OVERSIZED = 'oversized'
}

export enum VehicleCondition {
  RUNNING = 'running',
  NON_RUNNING = 'non-running',
  DAMAGED = 'damaged',
  MODIFIED = 'modified'
}

export interface Shipment {
  id: string;
  customerId: string;
  vehicle: Vehicle;
  origin: Location;
  destination: Location;
  status: ShipmentStatus;
  carrier?: Carrier;
  timeline: Timeline;
  pricing: Pricing;
  tracking: TrackingUpdate[];
  notes: Note[];
}

export interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  contact: ContactInfo;
}

export interface ContactInfo {
  name: string;
  phone: string;
  email?: string;
  preferredContactTime?: string;
}

export enum ShipmentStatus {
  QUOTE = 'quote',
  BOOKED = 'booked',
  DISPATCHED = 'dispatched',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export interface Carrier {
  id: string;
  name: string;
  dotNumber: string;
  mcNumber: string;
  insurance: Insurance;
  rating: CarrierRating;
  performance: CarrierPerformance;
  specialties: string[];
  blacklisted: boolean;
}

export interface CarrierRating {
  overall: number; // 0-5
  reliability: number;
  communication: number;
  care: number;
  reviewCount: number;
}

export interface CarrierPerformance {
  onTimeRate: number;
  damageRate: number;
  communicationScore: number;
  lastIncident?: Date;
  totalShipments: number;
  ghostingCount: number;
}

export interface Timeline {
  quoteDate: Date;
  bookingDate?: Date;
  estimatedPickup: DateRange;
  actualPickup?: Date;
  estimatedDelivery: DateRange;
  actualDelivery?: Date;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface Pricing {
  basePrice: number;
  deposit: number;
  balance: number;
  expeditedFee?: number;
  enclosedFee?: number;
  nonRunningFee?: number;
  totalPrice: number;
}

export interface TrackingUpdate {
  timestamp: Date;
  location: string;
  status: string;
  narrative?: string; // The poetic version
  weather?: WeatherCondition;
  photo?: string;
}

export interface WeatherCondition {
  condition: string;
  temperature: number;
  visibility: string;
  warnings?: string[];
}

export interface Note {
  timestamp: Date;
  author: string; // agent or coordinator name
  content: string;
  type: 'internal' | 'customer';
}

export interface ShipmentHistory {
  shipmentId: string;
  date: Date;
  satisfaction: number;
  issues?: string[];
}

export interface CustomerPreferences {
  communicationStyle: string;
  updateFrequency: 'minimal' | 'standard' | 'detailed';
  preferredCarrierType: 'any' | 'premium' | 'enclosed';
}

export interface Insurance {
  provider: string;
  policyNumber: string;
  coverage: number;
  expirationDate: Date;
}

// Liberation-specific types
export interface LiberationMetrics {
  date: Date;
  coordinatorsWorking: number;
  averageStressLevel: number;
  hoursGivenBack: number;
  breaksTaken: number;
  vacationsEnabled: number;
  problemsPrevented: number;
  customerSatisfaction: number;
  coordinatorWellness: number;
}

export interface WellnessIntervention {
  coordinatorId: string;
  type: 'break' | 'vacation' | 'workload' | 'stress';
  reason: string;
  action: string;
  timestamp: Date;
  automated: boolean;
}

export interface PredictedIssue {
  type: 'weather' | 'carrier' | 'route' | 'timing';
  probability: number;
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
  preventionAction?: () => Promise<void>;
}

// Agent communication types
export interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'alert' | 'update';
  content: any;
  correlationId: string;
  timestamp: Date;
}

export interface WorkflowContext {
  workflowId: string;
  initiator: string;
  currentStep: string;
  data: Record<string, any>;
  startTime: Date;
  agents: string[];
}
