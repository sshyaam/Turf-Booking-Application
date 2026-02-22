import { Injectable, inject, signal } from '@angular/core';
import { AuditEvent, Invite, MaintenanceBlock, Offer } from '../models/api.models';
import { AuthService } from './auth.service';

export interface PricingRule {
  id: string;
  label: string;
  multiplier: number;
  days: string[];
  startHour: number;
  endHour: number;
}

export interface PayoutSummary {
  id: string;
  period: string;
  amount: number;
  released: boolean;
}

@Injectable({ providedIn: 'root' })
export class ManagerToolsService {
  private auth = inject(AuthService);
  private offersSignal = signal<Offer[]>([]);
  private maintenanceSignal = signal<MaintenanceBlock[]>([]);
  private invitesSignal = signal<Invite[]>([]);
  private auditSignal = signal<AuditEvent[]>([]);
  private pricingRulesSignal = signal<PricingRule[]>([]);
  private payoutsSignal = signal<PayoutSummary[]>([]);

  readonly offers = this.offersSignal.asReadonly();
  readonly maintenanceBlocks = this.maintenanceSignal.asReadonly();
  readonly invites = this.invitesSignal.asReadonly();
  readonly auditTrail = this.auditSignal.asReadonly();
  readonly pricingRules = this.pricingRulesSignal.asReadonly();
  readonly payouts = this.payoutsSignal.asReadonly();

  constructor() {
    const period = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
    this.payoutsSignal.set([
      { id: crypto.randomUUID(), period, amount: 245000, released: false }
    ]);
  }

  addOffer(data: Omit<Offer, 'id'>) {
    const offer: Offer = { ...data, id: crypto.randomUUID() };
    this.offersSignal.set([offer, ...this.offersSignal()]);
    this.recordAudit(`Created promo ${offer.title}`);
  }

  blockMaintenance(block: Omit<MaintenanceBlock, 'id'>) {
    const entry: MaintenanceBlock = { ...block, id: Date.now() };
    this.maintenanceSignal.set([entry, ...this.maintenanceSignal()]);
    this.recordAudit(`Blocked dates on turf #${block.turfId}`);
  }

  sendInvite(invite: Omit<Invite, 'id' | 'status'>) {
    const entry: Invite = { ...invite, id: crypto.randomUUID(), status: 'SENT' };
    this.invitesSignal.set([entry, ...this.invitesSignal()]);
    this.recordAudit(`Invite sent to ${invite.sentTo}`);
  }

  updateInvite(id: string, status: Invite['status']) {
    this.invitesSignal.set(
      this.invitesSignal().map((invite) => (invite.id === id ? { ...invite, status } : invite))
    );
  }

  addPricingRule(rule: Omit<PricingRule, 'id'>) {
    const entry: PricingRule = { ...rule, id: crypto.randomUUID() };
    this.pricingRulesSignal.set([entry, ...this.pricingRulesSignal()]);
    this.recordAudit(`Pricing rule added (${rule.label})`);
  }

  addPayout(summary: Omit<PayoutSummary, 'id'>) {
    const entry: PayoutSummary = { ...summary, id: crypto.randomUUID() };
    this.payoutsSignal.set([entry, ...this.payoutsSignal()]);
  }

  recordAudit(action: string, target?: string) {
    const actor = this.auth.user()?.fullName || this.auth.user()?.email || 'dashboard-user';
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      actor,
      action,
      target,
      createdAt: new Date().toISOString()
    };
    this.auditSignal.set([event, ...this.auditSignal()]);
  }
}
