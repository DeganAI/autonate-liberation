// Utility functions for the Liberation Organization

import { Coordinator, CoordinatorStats, EmotionalProfile } from './types';

export function calculateStressLevel(stats: CoordinatorStats): number {
  const factors = {
    callVolume: Math.min(stats.callsToday / 40, 1) * 0.3,
    workingHours: Math.min(stats.hoursWorkedToday / 8, 1) * 0.3,
    consecutiveHours: Math.min((Date.now() - stats.lastBreak) / (2 * 60 * 60 * 1000), 1) * 0.4
  };
  
  return Object.values(factors).reduce((a, b) => a + b, 0);
}

export function needsBreak(coordinator: Coordinator): boolean {
  const timeSinceBreak = Date.now() - coordinator.status.lastBreak.getTime();
  const twoHours = 2 * 60 * 60 * 1000;
  
  return timeSinceBreak >= twoHours || 
         coordinator.stats.stressLevel > 0.7 ||
         coordinator.stats.callsToday > 30;
}

export function detectEmotionalState(message: string): Partial<EmotionalProfile> {
  const anxietyKeywords = ['worried', 'nervous', 'scared', 'anxious', 'concerned', 'first time'];
  const frustrationKeywords = ['angry', 'frustrated', 'annoyed', 'upset', 'terrible', 'worst'];
  const urgencyKeywords = ['asap', 'urgent', 'emergency', 'rush', 'immediately', 'deadline'];
  
  const lowerMessage = message.toLowerCase();
  
  let anxietyLevel = 0;
  let triggers: string[] = [];
  
  anxietyKeywords.forEach(keyword => {
    if (lowerMessage.includes(keyword)) {
      anxietyLevel += 0.2;
      triggers.push(keyword);
    }
  });
  
  frustrationKeywords.forEach(keyword => {
    if (lowerMessage.includes(keyword)) {
      anxietyLevel += 0.3;
      triggers.push(keyword);
    }
  });
  
  if (urgencyKeywords.some(keyword => lowerMessage.includes(keyword))) {
    triggers.push('urgency');
  }
  
  return {
    anxietyLevel: Math.min(anxietyLevel, 1),
    triggers,
    communicationStyle: anxietyLevel > 0.5 ? 'reassuring' : 'direct'
  };
}

export function generatePoetryFromLocation(lat: number, lng: number, time: Date): string {
  const templates = {
    morning: [
      "Dawn breaks over {location}, painting your {vehicle} in golden light",
      "Your {vehicle} greets the morning sun in {location}, ready for today's journey"
    ],
    afternoon: [
      "Cruising through {location} under perfect blue skies",
      "Your {vehicle} is making excellent time through sunny {location}"
    ],
    evening: [
      "As sunset approaches, your {vehicle} rests safely in {location}",
      "Evening falls on {location}, your {vehicle} secure for the night"
    ],
    night: [
      "Under a blanket of stars in {location}, your {vehicle} dreams of tomorrow's road",
      "The quiet night in {location} keeps watch over your {vehicle}"
    ]
  };
  
  const hour = time.getHours();
  let timeOfDay: keyof typeof templates;
  
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';
  
  const selectedTemplates = templates[timeOfDay];
  return selectedTemplates[Math.floor(Math.random() * selectedTemplates.length)];
}

export function calculateDeliveryEstimate(distance: number, serviceLevel: string): DateRange {
  const milesPerDay = 500;
  const baseDays = Math.ceil(distance / milesPerDay);
  
  let bufferDays = serviceLevel === 'expedited' ? 1 : 2;
  
  const start = new Date();
  start.setDate(start.getDate() + baseDays);
  
  const end = new Date();
  end.setDate(end.getDate() + baseDays + bufferDays);
  
  return { start, end };
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function generateOrderId(): string {
  const prefix = 'ORD';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function isBusinessHours(date: Date = new Date()): boolean {
  const hour = date.getHours();
  const day = date.getDay();
  
  // Monday-Friday, 8 AM - 6 PM
  return day >= 1 && day <= 5 && hour >= 8 && hour < 18;
}

export function selectBestCarrier(carriers: any[], requirements: any): any {
  return carriers
    .filter(c => !c.blacklisted)
    .filter(c => c.specialties.some((s: string) => requirements.specialties.includes(s)))
    .sort((a, b) => {
      // Sort by reliability score
      const scoreA = a.rating.overall * 0.4 + a.performance.onTimeRate * 0.4 + (1 - a.performance.damageRate) * 0.2;
      const scoreB = b.rating.overall * 0.4 + b.performance.onTimeRate * 0.4 + (1 - b.performance.damageRate) * 0.2;
      return scoreB - scoreA;
    })[0];
}

export function shouldEscalate(issue: any): boolean {
  const escalationTriggers = [
    'military',
    'deployment',
    'emergency',
    'medical',
    'funeral',
    'court',
    'legal'
  ];
  
  return escalationTriggers.some(trigger => 
    issue.description?.toLowerCase().includes(trigger)
  );
}

export function anonymizeCustomerData(data: any): any {
  const anonymized = { ...data };
  
  if (anonymized.email) {
    const [name, domain] = anonymized.email.split('@');
    anonymized.email = `${name.substring(0, 2)}***@${domain}`;
  }
  
  if (anonymized.phone) {
    anonymized.phone = anonymized.phone.substring(0, 6) + '****';
  }
  
  if (anonymized.creditCard) {
    anonymized.creditCard = '**** **** **** ' + anonymized.creditCard.slice(-4);
  }
  
  return anonymized;
}
