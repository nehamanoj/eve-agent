# Sandbox workspace

Files in `agent/sandbox/workspace/` are copied into `/workspace` when a session starts.

The model can read and write here with the built-in `bash`, `read_file`, and `write_file` tools. Authored agent files outside this folder are not available inside the sandbox.
