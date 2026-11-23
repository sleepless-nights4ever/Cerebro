# CEREBRO

CEREBRO is a wellness check-in and support prototype for a project demonstration. It includes a questionnaire assessment, daily mood history, a therapist request interface, and a chatbot with source links.

## Run locally

1. Install Node.js 20.19 or later and Python 3.11 or 3.12.
2. From the project folder, run `python -m pip install -r ai/requirements.txt`. On Windows you can use `py -m pip install -r ai/requirements.txt` if needed.
3. The packaged project includes `ai/stack.joblib`. If running from a source checkout without that file, run `python ai/evaluate_models.py --export-stack` to train it. If you use a virtual environment, keep it activated when starting Node, or set `PYTHON_BIN` to its Python executable.
4. In the `backend` folder, run `npm ci`. Create a local file named `.env` in that folder with your own values:

   ```dotenv
   MONGO_URI=mongodb://127.0.0.1:27017/mentalHealth
   JWT_SECRET=replace-with-a-fresh-random-secret
   GEMINI_API_KEY=
   ```

   Use a running local MongoDB or your own Atlas connection string. Set a fresh Gemini API key to enable generated chat responses and conversation analysis. Generate a fresh signing secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Credentials previously tracked in Git history should be rotated.

5. Start the server from `backend` with `node server.js`. Open [CEREBRO](http://localhost:5000/app), register, and sign in.

## Demonstrate the combined assessment

1. Send a sample message in chat, such as “I feel anxious about my exams and would like someone to talk to.”
2. Complete the questionnaire and select **Include my latest chat message**. Submit the assessment.
3. The stack reports the questionnaire proxy score. Gemini classifies the selected message's sentiment, emotion, and intent. The app uses those signals and the questionnaire score in a separate rule that selects a **Normal**, **Mild**, or **High** demo support band and a suggestion.

Only the selected message is sent for assessment analysis. The questionnaire and conversation analysis are processed separately, and assessment submission does not store the selected message or its labels in MongoDB. When Gemini is unavailable, the assessment returns the questionnaire result and labels the missing analysis. For ordinary chats that match the knowledge base, Gemini can receive recent turns and retrieved guidance. With no API key, the chatbot uses local guidance and accompanying WHO/NHS source links for matching topics. Use fictional inputs for demonstrations.

## Model evaluation and limitations

Run `python ai/evaluate_models.py` to compare Random Forest, XGBoost, MLP, and the stack. The exported stack achieved about 85% accuracy and 0.83 macro F1 on 19,608 held-out questionnaire records. These metrics describe how well the stack estimates an existing binary questionnaire rule. The MLP reached its iteration limit during training.

The report proposed DistilBERT as one transformer option. This implementation uses the app's Gemini integration for text classification. The CSV has no paired questionnaire/chat examples or independently labeled outcomes. The support band therefore uses a transparent rule over the model outputs and carries no clinical meaning. A trained three-class fusion model and its validation require a suitable paired dataset. Without the stack artifact, the app reports that its bundled Random Forest ran.
