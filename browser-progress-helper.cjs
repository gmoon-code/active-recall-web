'use strict';

// Research tools are intentionally collapsed on the learner-facing Progress page.
// Browser tests must expand the tools before exercising their existing workflows.
async function showResearchPanels(page){
  const details=page.locator('#progress-research');
  await details.waitFor();
  if(await details.getAttribute('open')===null){
    await details.locator(':scope > summary').click();
  }
}

module.exports={showResearchPanels};
