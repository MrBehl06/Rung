import type { Difficulty, Status, TopicType } from '../types';
import { TYPES } from '../types';

/**
 * Seed catalogue. Edit freely: adding a row here shows up as a new topic on the
 * next load; it never overwrites progress you already have, because the merge in
 * `loadState` keys on the derived `sid`.
 */
export const CATS: Record<TopicType, string[]> = {
  HLD: ['Fundamentals', 'Core Components', 'Database & Storage', 'Distributed Systems', 'HLD Problems'],
  LLD: ['Principles', 'Creational Patterns', 'Structural Patterns', 'Behavioral Patterns', 'LLD Problems'],
};

/** [name, difficulty, initialStatus?] */
type SeedRow = [string, Difficulty] | [string, Difficulty, Status];

export const SEED: Record<TopicType, Record<string, SeedRow[]>> = {
  HLD: {
    'Fundamentals': [
      ['Functional vs Non-Functional Requirements', 'Easy'],
      ['Scalability', 'Easy'],
      ['Availability & Reliability', 'Medium'],
      ['Latency vs Throughput', 'Easy'],
      ['CAP Theorem', 'Medium'],
      ['Consistency & Eventual Consistency', 'Medium'],
      ['Vertical vs Horizontal Scaling', 'Easy'],
      ['Monolith vs Microservices', 'Medium'],
    ],
    'Core Components': [
      ['DNS', 'Easy'],
      ['Load Balancer', 'Easy'],
      ['API Gateway', 'Medium'],
      ['CDN', 'Easy'],
      ['Reverse Proxy', 'Easy'],
      ['Redis / Caching', 'Medium'],
      ['Message Queue / Kafka', 'Hard'],
      ['Rate Limiter', 'Medium'],
      ['WebSockets', 'Medium'],
      ['REST vs gRPC', 'Medium'],
    ],
    'Database & Storage': [
      ['SQL vs NoSQL', 'Easy'],
      ['Indexing', 'Medium'],
      ['Replication', 'Medium'],
      ['Sharding', 'Hard'],
      ['Partitioning', 'Medium'],
      ['Consistent Hashing', 'Hard'],
      ['Transactions', 'Medium'],
      ['Object / File Storage', 'Easy'],
    ],
    'Distributed Systems': [
      ['Distributed Locks', 'Hard'],
      ['Leader Election', 'Hard'],
      ['Idempotency', 'Medium'],
      ['Retry & Backoff', 'Easy'],
      ['Circuit Breaker', 'Medium'],
      ['Fault Tolerance', 'Medium'],
      ['Event-Driven Architecture', 'Hard'],
    ],
    'HLD Problems': [
      ['URL Shortener', 'Easy'],
      ['Pastebin', 'Easy'],
      ['Rate Limiter', 'Medium'],
      ['Notification System', 'Medium'],
      ['File Storage', 'Medium'],
      ['Web Crawler', 'Medium'],
      ['YouTube', 'Hard'],
      ['Instagram', 'Medium'],
      ['WhatsApp', 'Hard'],
      ['Netflix', 'Hard'],
      ['Twitter / X', 'Hard'],
      ['Dropbox', 'Hard'],
      ['News Feed', 'Medium'],
      ['Uber / Ola', 'Hard'],
      ['Amazon', 'Hard'],
      ['LinkedIn', 'Hard'],
      ['Swiggy / Zomato', 'Hard'],
      ['Google Maps', 'Hard'],
      ['Payment System', 'Hard'],
      ['Ticket Booking System', 'Hard'],
      ['Chat System', 'Medium'],
    ],
  },
  LLD: {
    'Principles': [['SOLID Principles', 'Medium', 'Completed']],
    'Creational Patterns': [
      ['Factory', 'Easy', 'Completed'],
      ['Abstract Factory', 'Medium'],
      ['Builder', 'Easy'],
      ['Singleton', 'Easy'],
      ['Prototype', 'Medium'],
    ],
    'Structural Patterns': [
      ['Adapter', 'Easy'],
      ['Bridge', 'Medium'],
      ['Composite', 'Medium'],
      ['Decorator', 'Medium', 'Completed'],
      ['Facade', 'Easy'],
      ['Flyweight', 'Hard'],
      ['Proxy', 'Medium'],
    ],
    'Behavioral Patterns': [
      ['Observer', 'Medium', 'Completed'],
      ['Strategy', 'Easy', 'Completed'],
      ['Chain of Responsibility', 'Medium'],
      ['Command', 'Medium'],
      ['Interpreter', 'Hard'],
      ['Iterator', 'Easy'],
      ['Mediator', 'Medium'],
      ['Memento', 'Medium'],
      ['State', 'Medium'],
      ['Template Method', 'Easy'],
      ['Visitor', 'Hard'],
    ],
    'LLD Problems': [
      ['Pizza Billing System', 'Easy'],
      ['Vending Machine', 'Easy'],
      ['ATM', 'Medium'],
      ['Parking Lot', 'Medium'],
      ['Library Management System', 'Medium'],
      ['Restaurant Management System', 'Medium'],
      ['Notify-Me Button', 'Easy'],
      ['Tic-Tac-Toe', 'Easy'],
      ['Snake & Ladder', 'Easy'],
      ['Traffic Light System', 'Easy'],
      ['Elevator System', 'Medium'],
      ['Bowling Alley', 'Medium'],
      ['Meeting Scheduler', 'Medium'],
      ['Calendar Application', 'Medium'],
      ['Car Rental System', 'Medium'],
      ['Hotel Booking System', 'Medium'],
      ['Airline Management System', 'Hard'],
      ['Inventory Management System', 'Medium'],
      ['Logging System', 'Easy'],
      ['Cache Mechanism', 'Medium'],
      ['Online Voting System', 'Medium'],
      ['Learning Management System', 'Medium'],
      ['Community Discussion Platform', 'Medium'],
      ['Splitwise', 'Medium'],
      ['Splitwise Simplify Algorithm', 'Hard'],
      ['BookMyShow + Concurrency', 'Hard'],
      ['Payment System', 'Hard'],
      ['Chat System', 'Hard'],
      ['Rate Limiter', 'Medium'],
      ['Car Booking — Ola/Uber', 'Hard'],
      ['CricBuzz / CricketInfo', 'Medium'],
      ['Truecaller', 'Medium'],
      ['LinkedIn', 'Hard'],
      ['Amazon', 'Hard'],
      ['Food Delivery — Swiggy/Zomato', 'Hard'],
      ['Stock Exchange System', 'Hard'],
    ],
  },
};

export interface SeedTopic {
  sid: string;
  name: string;
  type: TopicType;
  category: string;
  difficulty: Difficulty;
  status: Status;
  order: number;
}

export function seedRows(): SeedTopic[] {
  const out: SeedTopic[] = [];
  for (const type of TYPES) {
    for (const cat of CATS[type]) {
      (SEED[type][cat] ?? []).forEach((row, i) => {
        out.push({
          sid: `${type}|${cat}|${row[0]}`.toLowerCase().replace(/\s+/g, '-'),
          name: row[0],
          type,
          category: cat,
          difficulty: row[1] ?? 'Medium',
          status: row[2] ?? 'Not Started',
          order: i,
        });
      });
    }
  }
  return out;
}
