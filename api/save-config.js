// Vercel Serverless Function: /api/save-config
// Directly commits new custom-metadata.json to GitHub repository!
// Works from any device (phone, laptop, etc.) without running local scripts.

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = req.body;
        if (!payload || typeof payload !== 'object') {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER || 'Paivster';
        const REPO_NAME = process.env.REPO_NAME || 'afonso-portfolio';
        const FILE_PATH = 'js/custom-metadata.json';

        if (!GITHUB_TOKEN) {
            return res.status(500).json({ 
                error: 'GITHUB_TOKEN environment variable is not configured in Vercel settings.' 
            });
        }

        const contentStr = JSON.stringify(payload, null, 4);
        const contentBase64 = Buffer.from(contentStr, 'utf-8').toString('base64');

        // 1. Get current file SHA from GitHub (needed to update an existing file)
        const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        const headers = {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'User-Agent': 'Vercel-Admin-CMS',
            'Accept': 'application/vnd.github.v3+json'
        };

        let fileSha = null;
        const getRes = await fetch(getUrl, { headers });
        if (getRes.ok) {
            const fileData = await getRes.json();
            fileSha = fileData.sha;
        }

        // 2. Commit updated file directly to repository main branch
        const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        const bodyPayload = {
            message: 'Update collections metadata via Online Admin CMS [skip ci]',
            content: contentBase64,
            branch: 'main'
        };
        if (fileSha) {
            bodyPayload.sha = fileSha;
        }

        const putRes = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyPayload)
        });

        if (!putRes.ok) {
            const errData = await putRes.json();
            return res.status(putRes.status).json({ 
                error: 'GitHub API error: ' + (errData.message || 'Failed to commit') 
            });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Alterações gravadas com sucesso no GitHub! O site será atualizado automaticamente.' 
        });

    } catch (err) {
        return res.status(500).json({ error: 'Internal server error: ' + err.message });
    }
}
