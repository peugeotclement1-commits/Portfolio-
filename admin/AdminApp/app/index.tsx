import { useState } from "react";
import { StyleSheet } from "react-native";

const styles= StyleSheet.create({
    /*feuille de style*/ 
})

/* exemple d'utilisation 
return (
  <View style={styles.page}>
    <Text style={styles.title}>Administration</Text>

    <TextInput
      style={styles.input}
      placeholder="Nom du projet"
      value={nom}
      onChangeText={setNom}
    />

    <Button title="Supprimer le projet" onPress={supprimerProject} />
  </View>
);
*/

/*A faire : 
-Faire la stylesheet
-Mettre à jour le html
-Finaliser*/

function App() {

    const [index, setIndex] = useState("");
    const [nom, setNom] = useState("");
    const [description, setDescription] = useState("");
    const [tag, setTag] = useState("");
    async function ajouterProjet() {

        const response = await fetch(
            "http://localhost:5000/api/projets",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    index: index,
                    nom: nom,
                    description: description,
                    tags: tag ? [tag] : []
                })
            }
        );

        const data = await response.json();

        console.log(data);
    }
    async function supprimerProject(){
        const response = await fetch( "http://localhost:5000/api/projetssupp",
        {
            method:"POST",
            
            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                index: index,
                nom: nom,
            })
            
        }

        )
    }

    return (
        <div>

            <h1>Administration</h1>

            <input
                type="text"
                placeholder="Index du projet"
                value={index}
                onChange={(e) => setIndex(e.target.value)}
            />

            <input
                type="text"
                placeholder="Nom du projet"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
            />

            <input
                type="text"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />

            <input
                type="text"
                placeholder="Tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
            />

            <button onClick={ajouterProjet}>
                Ajouter le projet
            </button>

            <input
                type="text"
                placeholder="Index du projet"
                value={index}
                onChange={(e) => setIndex(e.target.value)}
            />

            <input
                type="text"
                placeholder="Nom du projet"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
            />

            <button onClick={supprimerProject}>
                Supprimer Projet
            </button>


        </div>

    );
}
export default App;
