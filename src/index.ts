import { Application } from 'probot' // eslint-disable-line no-unused-vars

export = (app: Application) => {
  app.on('pull_request.review_requested', async (context) => {
    context.payload.pull_request.requested_teams.forEach((team) => {
      context.log.info(team.id)
      const teamId = team.id
      const membersResp = context.github.teams.listMembers({
        team_id: teamId
      })
      membersResp.then((response) => {
        const members = response.data.map((m) => m.login).filter((item) => item !== context.payload.pull_request.user.login)
        context.github.pulls.createReviewRequest({
          reviewers: members,
          pull_number: context.payload.pull_request.number,
          ...context.repo()
        })
      }, (value) => {
        context.log.error('Failure!', value)
      })
    })
  })
}
