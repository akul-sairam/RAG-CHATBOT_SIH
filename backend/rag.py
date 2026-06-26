from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
import os
import shutil

# Optional: Load environment variables from .env if using python-dotenv
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable not set.")

os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Global state
qa_chain = None
vectorstore = None
memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

@app.route("/")
def index():
    return jsonify({"status": "Backend is running"})

@app.route("/upload", methods=["POST"])
def upload_file():
    global qa_chain, vectorstore, memory
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and file.filename.endswith('.pdf'):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Process the uploaded PDF
            loader = PyPDFLoader(filepath)
            docs = loader.load()
            if not docs:
                return jsonify({"error": "No documents could be loaded from the PDF."}), 400
            
            # Add metadata for citations
            for doc in docs:
                doc.metadata["source"] = filename

            text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
            chunks = text_splitter.split_documents(docs)
            
            if vectorstore is None:
                vectorstore = FAISS.from_documents(chunks, embeddings)
            else:
                vectorstore.add_documents(chunks)
                
            retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 3})
            
            # Re-initialize conversational chain with existing memory but new retriever
            qa_chain = ConversationalRetrievalChain.from_llm(
                llm=llm,
                retriever=retriever,
                memory=memory,
                return_source_documents=True
            )
            
            return jsonify({"message": f"Successfully added {filename} to knowledge base"}), 200
        except Exception as e:
            return jsonify({"error": f"Error processing PDF: {str(e)}"}), 500
    else:
        return jsonify({"error": "Invalid file format. Please upload a PDF."}), 400

@app.route("/ask", methods=["POST"])
def ask():
    global qa_chain
    if qa_chain is None:
        return jsonify({"error": "Please upload a PDF first."}), 400
        
    data = request.get_json()
    query = data.get("query")
    if not query:
        return jsonify({"error": "No query provided"}), 400
        
    try:
        response = qa_chain({"question": query})
        
        # Extract sources
        sources = []
        if "source_documents" in response:
            for doc in response["source_documents"]:
                sources.append({
                    "content": doc.page_content,
                    "source": doc.metadata.get("source", "Unknown PDF"),
                    "page": doc.metadata.get("page", 0)
                })
                
        return jsonify({
            "response": response["answer"],
            "sources": sources
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/clear", methods=["POST"])
def clear():
    global qa_chain, vectorstore, memory
    try:
        qa_chain = None
        vectorstore = None
        memory.clear()
        
        # Clear uploads folder
        for filename in os.listdir(app.config['UPLOAD_FOLDER']):
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                pass
                
        return jsonify({"message": "Knowledge base cleared successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)