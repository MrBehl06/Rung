import type { SprintDef } from './types';

/**
 * Blind 75 — the widely-circulated LeetCode list, grouped by pattern.
 *
 * 75 problems exactly. "Merge K Sorted Lists" is commonly listed under both
 * Linked List and Heap; it lives under Heap here so the count is a true 75
 * rather than 76 with a duplicate.
 */
export const blind75: SprintDef = {
  id: 'blind75',
  name: 'Blind 75',
  short: 'DSA',
  tagline: 'The classic 75 that cover the patterns',
  icon: '🧩',
  accent: 'var(--ok)',
  categories: [
    {
      name: 'Array',
      rank: 0,
      rows: [
        ['Two Sum', 'Easy'],
        ['Best Time to Buy and Sell Stock', 'Easy'],
        ['Contains Duplicate', 'Easy'],
        ['Product of Array Except Self', 'Medium'],
        ['Maximum Subarray', 'Medium'],
        ['Maximum Product Subarray', 'Medium'],
        ['Find Minimum in Rotated Sorted Array', 'Medium'],
        ['Search in Rotated Sorted Array', 'Medium'],
        ['3Sum', 'Medium'],
        ['Container With Most Water', 'Medium'],
      ],
    },
    {
      name: 'Binary',
      rank: 6,
      rows: [
        ['Sum of Two Integers', 'Medium'],
        ['Number of 1 Bits', 'Easy'],
        ['Counting Bits', 'Easy'],
        ['Missing Number', 'Easy'],
        ['Reverse Bits', 'Easy'],
      ],
    },
    {
      name: 'String',
      rank: 10,
      rows: [
        ['Longest Substring Without Repeating Characters', 'Medium'],
        ['Longest Repeating Character Replacement', 'Medium'],
        ['Minimum Window Substring', 'Hard'],
        ['Valid Anagram', 'Easy'],
        ['Group Anagrams', 'Medium'],
        ['Valid Parentheses', 'Easy'],
        ['Valid Palindrome', 'Easy'],
        ['Longest Palindromic Substring', 'Medium'],
        ['Palindromic Substrings', 'Medium'],
        ['Encode and Decode Strings', 'Medium'],
      ],
    },
    {
      name: 'Linked List',
      rank: 14,
      rows: [
        ['Reverse a Linked List', 'Easy'],
        ['Detect Cycle in a Linked List', 'Easy'],
        ['Merge Two Sorted Lists', 'Easy'],
        ['Remove Nth Node From End Of List', 'Medium'],
        ['Reorder List', 'Medium'],
      ],
    },
    {
      name: 'Matrix',
      rank: 18,
      rows: [
        ['Set Matrix Zeroes', 'Medium'],
        ['Spiral Matrix', 'Medium'],
        ['Rotate Image', 'Medium'],
        ['Word Search', 'Medium'],
      ],
    },
    {
      name: 'Interval',
      rank: 20,
      rows: [
        ['Insert Interval', 'Medium'],
        ['Merge Intervals', 'Medium'],
        ['Non-overlapping Intervals', 'Medium'],
        ['Meeting Rooms', 'Easy'],
        ['Meeting Rooms II', 'Medium'],
      ],
    },
    {
      name: 'Tree',
      rank: 24,
      rows: [
        ['Maximum Depth of Binary Tree', 'Easy'],
        ['Same Tree', 'Easy'],
        ['Invert / Flip Binary Tree', 'Easy'],
        ['Binary Tree Maximum Path Sum', 'Hard'],
        ['Binary Tree Level Order Traversal', 'Medium'],
        ['Serialize and Deserialize Binary Tree', 'Hard'],
        ['Subtree of Another Tree', 'Easy'],
        ['Construct Binary Tree from Preorder and Inorder Traversal', 'Medium'],
        ['Validate Binary Search Tree', 'Medium'],
        ['Kth Smallest Element in a BST', 'Medium'],
        ['Lowest Common Ancestor of BST', 'Easy'],
        ['Implement Trie (Prefix Tree)', 'Medium'],
        ['Add and Search Word', 'Medium'],
        ['Word Search II', 'Hard'],
      ],
    },
    {
      name: 'Heap',
      rank: 28,
      rows: [
        ['Merge K Sorted Lists', 'Hard'],
        ['Top K Frequent Elements', 'Medium'],
        ['Find Median from Data Stream', 'Hard'],
      ],
    },
    {
      name: 'Graph',
      rank: 32,
      rows: [
        ['Clone Graph', 'Medium'],
        ['Course Schedule', 'Medium'],
        ['Pacific Atlantic Water Flow', 'Medium'],
        ['Number of Islands', 'Medium'],
        ['Longest Consecutive Sequence', 'Medium'],
        ['Alien Dictionary', 'Hard'],
        ['Graph Valid Tree', 'Medium'],
        ['Number of Connected Components in an Undirected Graph', 'Medium'],
      ],
    },
    {
      name: 'Dynamic Programming',
      rank: 36,
      rows: [
        ['Climbing Stairs', 'Easy'],
        ['Coin Change', 'Medium'],
        ['Longest Increasing Subsequence', 'Medium'],
        ['Longest Common Subsequence', 'Medium'],
        ['Word Break', 'Medium'],
        ['Combination Sum IV', 'Medium'],
        ['House Robber', 'Medium'],
        ['House Robber II', 'Medium'],
        ['Decode Ways', 'Medium'],
        ['Unique Paths', 'Medium'],
        ['Jump Game', 'Medium'],
      ],
    },
  ],
};
