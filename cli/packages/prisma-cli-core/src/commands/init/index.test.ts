// import * as nock from 'nock'
import { mocki } from './inquirer-mock-prompt'
import { Config } from 'prisma-cli-engine'
import Init from './'
import { writeToStdIn, DOWN, ENTER } from '../../test/writeToStdin'
import { getTmpDir } from '../../test/getTmpDir'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as cuid from 'scuid'

function makeMockConfig(mockInquirer?: any) {
  const home = getTmpDir()
  const cwd = path.join(home, cuid())
  fs.mkdirpSync(cwd)
  return {
    config: new Config({ mock: true, home, cwd, mockInquirer }),
    home,
    cwd,
  }
}

function getFolderContent(folder) {
  return fs
    .readdirSync(folder)
    .map(f => {
      let file = fs.readFileSync(path.join(folder, f), 'utf-8')
      if (f === 'docker-compose.yml') {
        file = normalizeDockerCompose(file)
      }
      return { [f]: file }
    })
    .reduce((acc, curr) => ({ ...acc, ...curr }), {})
}

async function testChoices(choices) {
  const mockInquirer = mocki(choices)
  const { config, home, cwd } = makeMockConfig(mockInquirer)
  const result = await Init.mock({ mockConfig: config })

  expect(getFolderContent(cwd)).toMatchSnapshot()
  expect(result.out.stdout.output).toMatchSnapshot()
  expect(result.out.stderr.output).toMatchSnapshot()
}

describe('init', () => {
  test('choose local', async () => {
    await testChoices({
      choice: 'local',
    })
  })

  test('test project', async () => {
    await testChoices({
      choice: 'Use existing database',
      dbType: 'postgres',
      host: 'localhost',
      port: 5432,
      database: process.env.TEST_PG_DB,
      user: process.env.TEST_PG_USER || 'postgres',
      password: process.env.TEST_PG_PASSWORD,
      alreadyData: false,
    })
  })
})

function normalizeDockerCompose(dc) {
  return dc
    .split('\n')
    .filter(
      l =>
        !l.trim().startsWith('user:') &&
        !l.trim().startsWith('password:') &&
        !l.trim().startsWith('database:'),
    )
    .join('\n')
}
