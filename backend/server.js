const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

function isValid(edge) {
    if (!/^[A-Z]->[A-Z]$/.test(edge)) return false;
    let [p, c] = edge.split("->");
    if (p === c) return false;
    return true;
}

app.post("/bfhl", (req, res) => {
    let input = req.body.data || [];

    let invalid = [];
    let duplicates = [];
    let seen = new Set();

    let graph = {};
    let indegree = {};
    let parentMap = {};
    let nodesSet = new Set();
    let order = []; 

    for (let edge of input) {
        let clean = edge.trim();

        if (clean === "" || !isValid(clean)) {
            if (clean !== "") invalid.push(clean);
            continue;
        }

        if (seen.has(clean)) {
            if (!duplicates.includes(clean)) duplicates.push(clean);
            continue;
        }

        seen.add(clean);

        let [u, v] = clean.split("->");

        if (!order.includes(u)) order.push(u);
        if (!order.includes(v)) order.push(v);

        if (parentMap[v]) continue;
        parentMap[v] = u;

        if (!graph[u]) graph[u] = [];
        graph[u].push(v);

        indegree[v] = (indegree[v] || 0) + 1;
        if (!indegree[u]) indegree[u] = indegree[u] || 0;

        nodesSet.add(u);
        nodesSet.add(v);
    }

    let nodes = Array.from(nodesSet);

    let undirected = {};
    for (let node of nodes) undirected[node] = [];

    for (let u in graph) {
        for (let v of graph[u]) {
            undirected[u].push(v);
            undirected[v].push(u);
        }
    }

    function getComponents() {
        let visited = new Set();
        let components = [];

        for (let node of nodes) {
            if (!visited.has(node)) {
                let stack = [node];
                let comp = [];

                while (stack.length) {
                    let curr = stack.pop();
                    if (!visited.has(curr)) {
                        visited.add(curr);
                        comp.push(curr);

                        for (let nei of undirected[curr]) {
                            stack.push(nei);
                        }
                    }
                }

                components.push(comp);
            }
        }

        return components;
    }

    let components = getComponents();

    components.sort((a, b) => {
        let minA = Math.min(...a.map(n => order.indexOf(n)));
        let minB = Math.min(...b.map(n => order.indexOf(n)));
        return minA - minB;
    });

    function detectCycle(node, visited, recStack, compSet) {
        if (!visited[node]) {
            visited[node] = true;
            recStack[node] = true;

            for (let nei of (graph[node] || [])) {
                if (!compSet.has(nei)) continue;

                if (!visited[nei] && detectCycle(nei, visited, recStack, compSet))
                    return true;
                else if (recStack[nei])
                    return true;
            }
        }
        recStack[node] = false;
        return false;
    }

    function buildTree(node, compSet) {
        let obj = {};
        for (let child of (graph[node] || [])) {
            if (!compSet.has(child)) continue;
            obj[child] = buildTree(child, compSet);
        }
        return obj;
    }

    function getDepth(node, compSet) {
        if (!graph[node] || graph[node].length === 0) return 1;

        let max = 0;
        for (let child of graph[node]) {
            if (!compSet.has(child)) continue;
            max = Math.max(max, getDepth(child, compSet));
        }
        return max + 1;
    }

   
    let hierarchies = [];
    let totalTrees = 0;
    let totalCycles = 0;
    let maxDepth = 0;
    let largestRoot = "";

    for (let comp of components) {
        let compSet = new Set(comp);

        let roots = comp.filter(n => indegree[n] === 0);

        if (roots.length === 0) {
            roots = [comp.slice().sort()[0]];
        }

        let root = roots[0];

        let visited = {};
        let recStack = {};

        let hasCycle = detectCycle(root, visited, recStack, compSet);

        if (hasCycle) {
            totalCycles++;
            hierarchies.push({
                root,
                tree: {},
                has_cycle: true
            });
        } else {
            totalTrees++;

            let tree = {};
            tree[root] = buildTree(root, compSet);

            let depth = getDepth(root, compSet);

            if (
                depth > maxDepth ||
                (depth === maxDepth && root < largestRoot)
            ) {
                maxDepth = depth;
                largestRoot = root;
            }

            hierarchies.push({
                root,
                tree,
                depth
            });
        }
    }

    
    res.json({
        user_id: "raunakjit_22062004",
        email_id: "rs@srmist.edu.in",
        college_roll_number: "RA2311003010412",
        hierarchies,
        invalid_entries: invalid,
        duplicate_edges: duplicates,
        summary: {
            total_trees: totalTrees,
            total_cycles: totalCycles,
            largest_tree_root: largestRoot
        }
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});