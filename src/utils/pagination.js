export function buildCursorOptions(query, maxLimit = 50) {
  const limit = Math.min(Number(query.limit ?? 20), maxLimit);
  const cursor = query.cursor;

  return {
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    limit
  };
}

export function formatCursorPage(items, limit) {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1]?.id : null;

  return {
    data,
    pageInfo: {
      nextCursor,
      hasMore
    }
  };
}
