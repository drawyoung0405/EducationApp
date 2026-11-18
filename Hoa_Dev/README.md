# Hoa_Dev

Hoa_Dev is a Windows command-line development agent for individual projects on D:. It uses Python 3.13+ and the standard library. Node.js on PATH enables JavaScript syntax checks.

## Interactive session

Run `python D:\Project\Hoa_Dev\agent.py`, then enter a project folder or alias. Type a goal at the Hoa_Dev prompt. Each goal starts a fresh agent run in the selected project. Review the printed diff and type y to apply it. Press Enter to keep the proposal for later. Use /inspect for offline project discovery, /key to enter an API key for this process, and /quit to exit.

## Command-line usage

From PowerShell:

```powershell
Set-Location D:\Project\Hoa_Dev
python agent.py add ielts "D:\Project\IELTS Vocabulary Studio"
python agent.py projects
python agent.py inspect --project ielts
```

For AI tasks, set an OpenAI API key in the current shell. A model with Chat Completions function calling is required. The default is gpt-4.1. Set OPENAI_MODEL to change it.

```powershell
$env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'OpenAI API key' -AsSecureString)).Password
python agent.py run --project ielts "Trace how saved vocabulary is stored. Cite file names."
python agent.py run --project "D:\OtherProject" "Fix the typo in the README and show the diff."
```

Use the absolute path to agent.py when running from another directory. Registering an alias is optional. The agent sends task text, applicable AGENTS.md guidance, and requested project text to the OpenAI API. Select a project whose contents you can share. Common credential paths are excluded, but source files can also contain private information.

## Review and recover

For an editing task, the agent prints a unified diff, syntax check results, and a run ID. Substitute that ID below.

```powershell
python agent.py show RUN_ID
python agent.py apply RUN_ID
python agent.py undo RUN_ID
```

Proposals stay off the working tree until applied. Apply and undo check current file contents before replacement. After an interruption, rerun the same command to finish. Undo restores edited text and removes created files. Newly created parent directories can remain. Project aliases and run records (including original and proposed file contents) live under %LOCALAPPDATA%\Hoa_Dev. The workflow works with or without Git.

## Scope of version 1

The agent lists, searches, reads and proposes edits to UTF-8 text files up to 2 MB. It discovers local guidance and can inspect manifests and test scripts. Each run is limited to 40 model requests and a ten-minute scheduling window. Local checks cover Python and JSON syntax, plus JavaScript and inline HTML scripts when Node is available. Browser behavior, builds, and project-specific test suites require separate verification. This release does not execute model-generated shell commands.
