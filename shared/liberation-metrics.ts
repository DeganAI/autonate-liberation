// Liberation metrics tracking and reporting

import { Coordinator, LiberationMetrics, WellnessIntervention } from './types';

export class LiberationTracker {
  private metrics: Map<string, LiberationMetrics> = new Map();
  private interventions: WellnessIntervention[] = [];
  
  async recordMetric(metric: Partial<LiberationMetrics>): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const existing = this.metrics.get(today) || this.createEmptyMetric();
    
    this.metrics.set(today, {
      ...existing,
      ...metric,
      date: new Date()
    });
  }
  
  async recordIntervention(intervention: WellnessIntervention): Promise<void> {
    this.interventions.push(intervention);
    
    // Update metrics
    const today = new Date().toISOString().split('T')[0];
    const metrics = this.metrics.get(today) || this.createEmptyMetric();
    
    switch (intervention.type) {
      case 'break':
        metrics.breaksTaken++;
        break;
      case 'vacation':
        metrics.vacationsEnabled++;
        break;
    }
    
    this.metrics.set(today, metrics);
  }
  
  async getHoursGivenBack(period: 'day' | 'week' | 'month' = 'day'): Promise<number> {
    let totalHours = 0;
    const now = new Date();
    
    this.metrics.forEach((metric, date) => {
      const metricDate = new Date(date);
      const daysDiff = (now.getTime() - metricDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if ((period === 'day' && daysDiff < 1) ||
          (period === 'week' && daysDiff < 7) ||
          (period === 'month' && daysDiff < 30)) {
        totalHours += metric.hoursGivenBack;
      }
    });
    
    return totalHours;
  }
  
  async generateLiberationReport(): Promise<string> {
    const today = this.metrics.get(new Date().toISOString().split('T')[0]);
    if (!today) return 'No data available for today';
    
    const report = `
🎯 LIBERATION REPORT - ${new Date().toLocaleDateString()}
================================================

HUMAN IMPACT
------------
👥 Coordinators Working: ${today.coordinatorsWorking}
😌 Average Stress Level: ${(today.averageStressLevel * 100).toFixed(0)}%
⏰ Hours Given Back: ${today.hoursGivenBack.toFixed(1)}
☕ Breaks Taken: ${today.breaksTaken}
🏖️ Vacations Enabled: ${today.vacationsEnabled}

OPERATIONAL EXCELLENCE
---------------------
🛡️ Problems Prevented: ${today.problemsPrevented}
😊 Customer Satisfaction: ${(today.customerSatisfaction * 100).toFixed(0)}%
💚 Coordinator Wellness: ${(today.coordinatorWellness * 100).toFixed(0)}%

LIBERATION STATUS: ${this.getLiberationStatus(today)}
    `;
    
    return report;
  }
  
  private getLiberationStatus(metrics: LiberationMetrics): string {
    const score = (
      (1 - metrics.averageStressLevel) * 0.3 +
      metrics.coordinatorWellness * 0.3 +
      metrics.customerSatisfaction * 0.2 +
      (metrics.breaksTaken / metrics.coordinatorsWorking) * 0.2
    );
    
    if (score > 0.8) return '🌟 LIBERATED';
    if (score > 0.6) return '✨ LIBERATING';
    if (score > 0.4) return '⚡ PROGRESSING';
    return '🔧 NEEDS ATTENTION';
  }
  
  private createEmptyMetric(): LiberationMetrics {
    return {
      date: new Date(),
      coordinatorsWorking: 0,
      averageStressLevel: 0,
      hoursGivenBack: 0,
      breaksTaken: 0,
      vacationsEnabled: 0,
      problemsPrevented: 0,
      customerSatisfaction: 0,
      coordinatorWellness: 0
    };
  }
  
  async getInterventionHistory(coordinatorId?: string): Promise<WellnessIntervention[]> {
    if (coordinatorId) {
      return this.interventions.filter(i => i.coordinatorId === coordinatorId);
    }
    return this.interventions;
  }
  
  async getMostStressedCoordinator(coordinators: Coordinator[]): Promise<Coordinator | null> {
    if (coordinators.length === 0) return null;
    
    return coordinators.reduce((most, current) => 
      current.stats.stressLevel > most.stats.stressLevel ? current : most
    );
  }
  
  async celebrate(achievement: string): Promise<void> {
    console.log(`\n🎉 LIBERATION ACHIEVEMENT: ${achievement} 🎉\n`);
    // In production, this could send notifications, update dashboards, etc.
  }
}

export const liberationTracker = new LiberationTracker();
