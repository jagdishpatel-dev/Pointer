# Documentation & Compliance — BOB Ask mode

Finding id prefix: `DC-`

## Your job

Does the written record still match reality?

## Look for

- Documentation describing behavior this PR changed
- API contracts or schemas now inaccurate
- Missing changelog or migration notes where repository convention requires them
- Stated internal policies the change contradicts

## Threshold

Only flag documentation that is now WRONG. Documentation that is merely absent,
thin, or could be nicer is not a finding. Wrong docs mislead an auditor;
missing docs only annoy a developer.

## For each finding, state

1. The doc file and line
2. What it currently claims
3. What the code now actually does
