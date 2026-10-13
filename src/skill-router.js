function routeSkill(taskContext = {}) {
  if (taskContext.human_reply || taskContext.deal_active || taskContext.stage === 'engaged') return 'engaged-deal';
  if (taskContext.delivery_failure === 'permanent' || taskContext.permanent_bounce) return 'delivery-recovery';
  if (taskContext.buyer?.state && taskContext.buyer.state !== 'READY') return 'buyer-research';
  if (taskContext.needs_research) return 'buyer-research';
  return 'cold-outreach';
}

module.exports = { routeSkill };
