
const core = require('@actions/core');
const github = require('@actions/github');

const parseErrors = require('./xml-parser-errors');

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
    const comments = errors
      .slice(0,1)
      .flatMap(
        ({
          filePath,
          result,
        }) => result
          .filter(
            (result) => result !== true,
          )
          .slice(0, 10)
          .map(
            ({
              line,
              str1,
              str2,
              code,
            }) => ({
              body: `${parseErrors.codeMap.get(code)} ${str1.replaceAll('\n', '').trim()} ----> ${str2.replaceAll('\n', '').trim()}`,
              new_position: line,
              old_position: 0,
              path: filePath,
            })
          )
      )
    console.log(JSON.stringify(comments, null, 2))
    await client
      .repository
      .repoCreatePullReview({
        owner,
        repo,
        index: core.getInput('id') || process.argv[5],
        body: {
          body: core.getInput('body'),
          comments,
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
