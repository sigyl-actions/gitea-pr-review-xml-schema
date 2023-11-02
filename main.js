
const core = require('@actions/core');
const github = require('@actions/github');

const { GiteaApi } = require('gitea-api');

async function run() {
  try {
    const serverUrl = core.getInput('serverUrl')
      || (github.context.runId && github.context.serverUrl)
      || process.argv[3]

    const client = new GiteaApi({
      BASE: `${serverUrl}/api/v1`,
      WITH_CREDENTIALS: true,
      TOKEN: core.getInput('token') || process.argv[2],
    });
    const [owner, repo] = (
      core.getInput('repository')
      || github?.context?.payload?.repository?.full_name
      || process.argv[4]
    ).split("/");

    const errors = JSON.parse(core.getInput('errors'));
    await client
      .repository
      .repoCreatePullReview({
        owner,
        repo,
        index: core.getInput('id') || process.argv[5],
        body: {
          body: core.getInput('body'),
          comments: errors
            .flatMap(
              ({
                filePath,
                result,
              }) => result
                .map(
                  ({
                    line,
                    str1,
                    str2
                  }) => ({
                    body: `${str1} ----> ${str2}`,
                    old_position: line,
                    new_position: 0,
                    path: filePath,
                  })
                )
            ),
          commit_id: core.getInput('commit') || github?.context?.payload?.sha,
          event: core.getInput('event')
        },
      })
  }
  catch (error) {
    console.error(error)
    core.setFailed(error.message);
  }
}

run()