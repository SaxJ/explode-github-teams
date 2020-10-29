import { Application } from 'probot' // eslint-disable-line no-unused-vars

export = (app: Application) => {
  app.on('pull_request.review_requested', async (context) => {
    const { payload, github, repo, log } = context
    const pr = payload.pull_request

    try {
      const teamIds: number[] = pr.requested_teams.map((team) => team.id)

      /** If no teams have been added, there is nothing for us to do */
      if (teamIds.length === 0) return

      /** Member responses for each team */
      const teamLists = await Promise.all(
        teamIds.map(async (id) => github.teams.listMembers({ team_id: id }))
      )

      /** a flat, randomized list of member logins to add, excluding the owner */
      const membersToAdd = uniqueValues(
        teamLists
          .map((response) => response.data)
          .flat()
          .map((member) => member.login)
          .filter((login) => login !== pr.user.login)
      ).sort(randomize)

      /** Remove the teams */
      await github.pulls.deleteReviewRequest({
        team_reviewers: pr.requested_teams.map((team) => team.slug),
        reviewers: [],
        pull_number: pr.number,
        ...context.repo()
      })

      /** Add the members explicitly */
      await github.pulls.createReviewRequest({
        reviewers: membersToAdd,
        pull_number: pr.number,
        ...context.repo()
      })
    } catch (error) {
      log.error('Failure!', error)
    }
  })
};

const randomize = () => 0.5 - Math.random()

const uniqueValues = <T>(list: T[]) => [...new Set(list)]
