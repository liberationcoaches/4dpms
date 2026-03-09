import { User } from '../models/User';

/**
 * Iteratively finds all users whose reportsTo chain leads up to the given userId.
 * Uses BFS to avoid call-stack issues on deep/wide org trees.
 *
 * @param userId  The root user whose subtree you want (their ID is NOT included in the result).
 * @returns       Array of ObjectId strings for every user that reports (directly or indirectly) to userId.
 */
export async function getUserSubtree(userId: string): Promise<string[]> {
    const visited = new Set<string>();
    const queue: string[] = [userId];
    const result: string[] = [];

    while (queue.length > 0) {
        // Take the next batch from the queue
        const currentBatch = queue.splice(0, queue.length); // drain queue

        // Find all direct reports for every node in the current batch in one query
        const directReports = await User.find(
            { reportsTo: { $in: currentBatch } },
            { _id: 1 }
        ).lean();

        for (const report of directReports) {
            const id = report._id.toString();
            if (!visited.has(id)) {
                visited.add(id);
                result.push(id);
                queue.push(id); // explore their subtree next iteration
            }
        }
    }

    return result;
}
