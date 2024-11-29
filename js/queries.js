// The login doesn't use GraphQL - it uses a REST endpoint
const AUTH_URL = 'https://learn.01founders.co/api/auth/signin';

// User Info Query
const GET_USER_INFO = `
  query {
    user(limit: 1) {
      id
      login
    }
    user_public_view(limit: 1) {
      profile(path: "level")
    }
  }
`;

// User Profile Query
const GET_USER_PROFILE = `
  query GetUserProfile($userId: Int!) {
    user_public_view(where: {id: {_eq: $userId}}, limit: 1) {
      id
      login
      firstName
      lastName
      profile(path: "level")
      expectedLevel: profile(path: "expectedLevel")
      skillsProgress: profile(path: "skillsProgress")
      rank: profile(path: "rank")
      nextRank: profile(path: "nextRank")
    }
    transaction_aggregate(
      where: { 
        userId: {_eq: $userId}, 
        type: {_eq: "xp"} 
      }
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }
    progress(
      where: { 
        userId: {_eq: $userId}, 
        grade: {_gt: 0}, 
        object: {type: {_eq: "project"}} 
      }
    ) {
      id
      grade
      createdAt
      updatedAt
      object {
        id
        name
        type
      }
    }
    transaction(
      where: { 
        userId: {_eq: $userId}, 
        type: {_eq: "xp"} 
      }
      order_by: {createdAt: desc}
    ) {
      id
      amount
      createdAt
      object {
        id
        name
        type
      }
    }
  }
`;

// User Progress Query
const GET_USER_PROGRESS = `
  query getUserProgress($userId: Int!) {
    progress(where: { userId: { _eq: $userId } }) {
      id
      grade
      object {
        name
        type
      }
      updatedAt
    }
  }
`;

// XP Query
const GET_XP_TRANSACTIONS = `
  query getXPTransactions($userId: Int!) {
    transaction(
      where: { userId: { _eq: $userId }, type: { _eq: "xp" } }
      order_by: { createdAt: asc }
    ) {
      amount
      createdAt
      object {
        name
        type
      }
    }
  }
`;

// Total XP Query
const GET_TOTAL_XP = `
  query getTotalXP($userId: Int!) {
    transaction_aggregate(
      where: { userId: { _eq: $userId }, type: { _eq: "xp" } }
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }
  }
`;

// Audit Results Query
const GET_PASS_FAIL_RATIO = `
  query getPassFailRatio($userId: Int!) {
    result(where: { userId: { _eq: $userId } }) {
      grade
    }
  }
`;

// Skills Data Query (Updated to match schema)
const GET_SKILLS_DATA = `
  query getSkillsData($userId: Int!) {
    progress(where: {
      userId: { _eq: $userId },
      object: { type: { _eq: "project" } }
    }) {
      id
      grade
      createdAt
      updatedAt
      object {
        id
        name
        type
      }
    }
    transaction(
      where: {
        userId: { _eq: $userId },
        type: { _eq: "skill" }
      }
    ) {
      amount
      createdAt
      object {
        id
        name
        type
      }
    }
  }
`;

// Updated Skills Data Query
const GET_DETAILED_SKILLS = `
    query GetDetailedSkills($userId: Int!) {
        progress(
            where: {
                userId: { _eq: $userId },
                grade: { _gt: 0 },
                object: { type: { _eq: "project" }}
            }
            order_by: { updatedAt: desc }
        ) {
            id
            grade
            updatedAt
            object {
                id
                name
                type
            }
        }
        transaction(
            where: {
                userId: { _eq: $userId },
                type: { _in: ["skill", "up"] }
            }
        ) {
            id
            type
            amount
            createdAt
            object {
                id
                name
                type
            }
        }
    }
`;

// Comment out unused queries
/*
const GET_AUDIT_RESULTS = `
    query getAuditResults($userId: Int!) {
        result(where: { userId: { _eq: $userId }, type: { _eq: "audit" } }) {
            id
            grade
            createdAt
            object {
                name
                type
            }
            user {
                login
            }
        }
    }
`;
*/

window.Queries = {
    GET_USER_INFO,
    GET_TOTAL_XP,
    GET_XP_TRANSACTIONS,
    GET_USER_PROGRESS,
    GET_PASS_FAIL_RATIO,
    GET_SKILLS_DATA,
    // GET_AUDIT_RESULTS,  // Comment out
    GET_DETAILED_SKILLS
};