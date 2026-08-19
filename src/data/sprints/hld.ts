import type { SprintDef } from './types';

/**
 * High Level Design — 54 topics across 5 categories.
 *
 * Category order drives skill-tree unlocking; `rank` drives "study next"
 * ordering. Both were lifted from the pre-registry catalogue unchanged, and
 * every row name/difficulty/status must stay byte-identical: the derived `sid`
 * is what reattaches a user's saved progress on load.
 */
export const hld: SprintDef = {
  id: 'hld',
  name: 'High Level Design',
  short: 'HLD',
  tagline: 'Design systems that survive scale',
  icon: '🏗',
  accent: 'var(--hld)',
  categories: [
    {
      name: 'Fundamentals',
      rank: 0,
      rows: [
        ['Functional vs Non-Functional Requirements', 'Easy'],
        ['Scalability', 'Easy'],
        ['Availability & Reliability', 'Medium'],
        ['Latency vs Throughput', 'Easy'],
        ['CAP Theorem', 'Medium'],
        ['Consistency & Eventual Consistency', 'Medium'],
        ['Vertical vs Horizontal Scaling', 'Easy'],
        ['Monolith vs Microservices', 'Medium'],
      ],
    },
    {
      name: 'Core Components',
      rank: 8,
      rows: [
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
    },
    {
      name: 'Database & Storage',
      rank: 14,
      rows: [
        ['SQL vs NoSQL', 'Easy'],
        ['Indexing', 'Medium'],
        ['Replication', 'Medium'],
        ['Sharding', 'Hard'],
        ['Partitioning', 'Medium'],
        ['Consistent Hashing', 'Hard'],
        ['Transactions', 'Medium'],
        ['Object / File Storage', 'Easy'],
      ],
    },
    {
      name: 'Distributed Systems',
      rank: 24,
      rows: [
        ['Distributed Locks', 'Hard'],
        ['Leader Election', 'Hard'],
        ['Idempotency', 'Medium'],
        ['Retry & Backoff', 'Easy'],
        ['Circuit Breaker', 'Medium'],
        ['Fault Tolerance', 'Medium'],
        ['Event-Driven Architecture', 'Hard'],
      ],
    },
    {
      name: 'HLD Problems',
      rank: 32,
      rows: [
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
  ],
};
