# CEREBRO

CEREBRO is a wellness check-in and chat prototype. The existing assessment uses an experimental questionnaire-derived score. Use it for project demonstration.

## Run locally

1. Install Node.js 20.19 or later and Python 3.11 or 3.12.
2. From the repository root, run `python -m pip install -r ai/requirements.txt`.
3. In `backend`, run `npm ci`. Set `MONGO_URI` and `JWT_SECRET` in your local environment or in `backend/.env`. Optionally set `GEMINI_API_KEY`.
4. From `backend`, run `node server.js`. Open the HTML file in `frontend` and register or sign in.

Chat retrieves short summaries from WHO and NHS guidance when a message matches the covered topics. With Gemini configured, the matching summaries are passed to the model. Without Gemini, matching chats return local guidance and source links. When using Gemini, matching messages and recent conversation turns are sent to that service. Use synthetic inputs for demonstrations.

## Compare the assessment models

Run `python ai/evaluate_models.py` from the repository root. The script evaluates Random Forest, XGBoost, MLP, and a stacked ensemble against the existing binary questionnaire rule. It reports a holdout classification report and confusion matrix for each. The live app uses the existing Random Forest artifact.

The repository CSV has questionnaire responses. Learning and evaluating a fused questionnaire/chat model requires paired, consented examples and independently defined target labels. Model comparison with the binary proxy cannot validate the proposed three-level wellness outcome.
