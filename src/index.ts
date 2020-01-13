import { Application } from 'probot' // eslint-disable-line no-unused-vars

export = (app: Application) => {
  app.on('pull_request.review_requested', async context => {
    try {
      await Promise.all(
        context.payload.pull_request.requested_teams.map(async team => {
          context.log.info(team.id)
          const teamId = team.id
          const response = await context.github.teams.listMembers({
            team_id: teamId
          })

          const members = response.data
            .map(m => m.login)
            .filter(item => item !== context.payload.pull_request.user.login)
            .sort((a, b) => 0.5 - Math.random())

          await context.github.pulls.createReviewRequest({
            reviewers: members,
            pull_number: context.payload.pull_request.number,
            ...context.repo()
          })
        })
      )
    } catch (error) {
      context.log.error('Failure!', error)
    }
  })
};
