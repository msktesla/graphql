class APIService extends BaseAPI {
    static async fetchUserData(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const [userInfo, totalXP, progress, xpTransactions, results] = await Promise.all([
                this.graphqlRequest(Queries.GET_USER_INFO),
                this.graphqlRequest(Queries.GET_TOTAL_XP, { userId }),
                this.graphqlRequest(Queries.GET_USER_PROGRESS, { userId }),
                this.graphqlRequest(Queries.GET_XP_TRANSACTIONS, { userId }),
                this.graphqlRequest(Queries.GET_PASS_FAIL_RATIO, { userId })
            ]);

            return {
                user: {
                    ...userInfo.user[0],
                    level: userInfo.user_public_view?.[0]?.userLevel || 1,
                    xpAmount: userInfo.user_public_view?.[0]?.userXP || 0,
                    profile: userInfo.user_public_view?.[0]?.profile || {}
                },
                totalXP: totalXP.transaction_aggregate.aggregate.sum.amount || 0,
                progress: progress.progress || [],
                xpTransactions: xpTransactions.transaction || [],
                results: results.result || []
            };
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
}

window.APIService = APIService;