import { Probot } from "probot"; // eslint-disable-line no-unused-vars

export = (app: Probot) => {
  app.on("pull_request.review_requested", async (context) => {
    const { payload, octokit, log } = context;
    const pr = payload.pull_request;
    const orgName = payload.organization?.login ?? null;

    const explodeConfig = await context.config("explode.yml", {
      max_reviewers: 20,
    });

    try {
      const teamSlugs = pr.requested_teams.map((team) => team.slug);

      /** If no teams have been added, there is nothing for us to do */
      if (teamSlugs.length === 0 || orgName === null) return;

      /** Members for each team */
      const teamLists = await Promise.all(
        teamSlugs.map(async (slug) =>
          octokit.teams.listMembersInOrg({
            org: orgName,
            team_slug: slug,
          }),
        ),
      );

      /** a flat, randomized list of member logins to add, excluding the owner */
      const membersToAdd = uniqueValues(
        teamLists
          .map((response) => response.data)
          .flat()
          .map((member) => member.login)
          .filter((login) => login !== pr.user.login),
      )
        .sort(randomize)
        .slice(0, explodeConfig?.max_reviewers ?? -1);

      /** Remove the teams */
      await octokit.pulls.removeRequestedReviewers({
        ...context.pullRequest(),
        reviewers: [],
        team_reviewers: pr.requested_teams.map((team) => team.slug),
      });

      /** Add the members explicitly */
      await octokit.pulls.requestReviewers({
        ...context.pullRequest(),
        reviewers: membersToAdd,
      });
    } catch (error) {
      log.error("Failure!", error);
    }
  });
};

const randomize = () => 0.5 - Math.random();

const uniqueValues = <T>(list: T[]) => [...new Set(list)];
