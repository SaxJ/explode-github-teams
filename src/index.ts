import { Application } from 'probot' // eslint-disable-line no-unused-vars

export = (app: Application) => {
  app.on('pull_request.review_requested', async (context) => {
    const handleError = (reason: unknown) => {
      context.log.error('Failure!', reason)
    }

    try {
      context.payload.pull_request.requested_teams.forEach((team) => {
        context.log.info(team.id)
        const teamId = team.id
        const membersResp = context.github.teams.listMembers({
          team_id: teamId
        })

        return membersResp.then((response) => {
          const members = response.data.map((m) => m.login)
            .filter((item) => item !== context.payload.pull_request.user.login)
            .sort((a, b) => 0.5 - Math.random())

          return context.github.pulls.createReviewRequest({
            reviewers: members,
            pull_number: context.payload.pull_request.number,
            ...context.repo()
          })
        }).catch(handleError)
      })
    } catch (error) { handleError(error) }
  })
}
