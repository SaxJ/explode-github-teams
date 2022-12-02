import { Probot } from 'probot' // eslint-disable-line no-unused-vars

export = (app: Probot) => {
  app.on('pull_request.review_requested', async (context) => {
    const { payload, octokit, log  } = context;
    const pr = payload.pull_request;
    const orgName = payload.organization?.login ?? null;
    log.error('ORG:' + JSON.stringify(payload));


    try {
      const teamSlugs = pr.requested_teams.map(team => team.slug);
      log.error(JSON.stringify(teamSlugs));

      /** If no teams have been added, there is nothing for us to do */
      if (teamSlugs.length === 0 || orgName === null) return

      /** Members for each team */
      const teamLists = await Promise.all(
        teamSlugs.map(async (slug) => octokit.teams.listMembersInOrg({
          org: orgName,
          team_slug: slug,
        }))
      );
      log.error(JSON.stringify(teamLists));

      /** a flat, randomized list of member logins to add, excluding the owner */
      const membersToAdd = uniqueValues(
        teamLists
          .map((response) => response.data)
          .flat()
          .map((member) => member.login)
          .filter((login) => login !== pr.user.login)
      ).sort(randomize)

      log.error(JSON.stringify(membersToAdd));

      /** Remove the teams */
      await octokit.pulls.removeRequestedReviewers({
        ...context.pullRequest(),
        reviewers: [],
        team_reviewers: pr.requested_teams.map(team => team.slug),
      });

      log.error('Removed old');

      /** Add the members explicitly */
      await octokit.pulls.requestReviewers({
        ...context.pullRequest(),
        reviewers: membersToAdd,
      });

      log.error('Added members')
    } catch (error) {
      log.error('Failure!', error)
    }
  })
};

const randomize = () => 0.5 - Math.random()

const uniqueValues = <T>(list: T[]) => [...new Set(list)]
