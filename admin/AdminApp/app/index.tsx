import { useState } from "react";
import { Alert, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

const API_URL = "http://localhost:5000";
const PORTFOLIO_CONTACT_MAIL_URL = "https://mail.google.com/mail/u/0/#label/Portfolio%20Contact";

type ProjectPayload = { index: string; nom: string; description: string; tags: string[]; lien : string };

export default function App() {
  const [addIndex, setAddIndex] = useState("");
  const [addNom, setAddNom] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");
  const [lien, setLien] = useState("");
  const [deleteIndex, setDeleteIndex] = useState("");
  const [deleteNom, setDeleteNom] = useState("");

  async function envoyer(path: string, body: ProjectPayload | Pick<ProjectPayload, "index" | "nom">) {
    const response = await fetch(`${API_URL}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "La requête a échoué.");
    return data;
  }

  async function ajouterProjet() {
    if (!addIndex.trim() || !addNom.trim()) return Alert.alert("Informations manquantes", "Renseignez au minimum l'index et le nom du projet.");
    try {
      const data = await envoyer("/api/projets", { index: addIndex, nom: addNom, description, tags: tag.trim() ? [tag.trim()] : [], lien });
      Alert.alert("Projet ajouté", data.message ?? "Le projet a bien été ajouté.");
      setAddIndex(""); setAddNom(""); setDescription(""); setTag(""); setLien("");
    } catch (error) { Alert.alert("Erreur", error instanceof Error ? error.message : "Une erreur est survenue."); }
  }

  async function supprimerProjet() {
    if (!deleteIndex.trim() || !deleteNom.trim()) return Alert.alert("Informations manquantes", "Renseignez l'index et le nom du projet à supprimer.");
    try {
      const data = await envoyer("/api/projetssupp", { index: deleteIndex, nom: deleteNom });
      Alert.alert("Projet supprimé", data.message ?? "Le projet a bien été supprimé.");
      setDeleteIndex(""); setDeleteNom("");
    } catch (error) { Alert.alert("Erreur", error instanceof Error ? error.message : "Une erreur est survenue."); }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>ADMINISTRATION</Text>
          <Text style={styles.sectionTitle}>Projets :</Text>
          <View style={styles.separator} />
          <View style={styles.projectActions}>
            <View style={styles.addColumn}>
              <TextInput style={styles.input} placeholder="Index" placeholderTextColor="#8b8b8b" value={addIndex} onChangeText={setAddIndex} />
              <TextInput style={styles.input} placeholder="Nom" placeholderTextColor="#8b8b8b" value={addNom} onChangeText={setAddNom} />
              <TextInput style={styles.input} placeholder="Description" placeholderTextColor="#8b8b8b" value={description} onChangeText={setDescription} />
              <TextInput style={styles.input} placeholder="Tag" placeholderTextColor="#8b8b8b" value={tag} onChangeText={setTag} />
              <TextInput style={styles.input} placeholder="Lien" placeholderTextColor="#8b8b8b" value={lien} onChangeText={setLien} />
              <ActionButton label="Ajouter projet" onPress={ajouterProjet} />
            </View>
            <View style={styles.actionColumn}><ActionButton label="Modifier projet" onPress={() => Alert.alert("Modification", "La route de modification du projet n'est pas encore disponible.")} /></View>
            <View style={styles.deleteColumn}>
              <TextInput style={styles.input} placeholder="Index" placeholderTextColor="#8b8b8b" value={deleteIndex} onChangeText={setDeleteIndex} />
              <TextInput style={styles.input} placeholder="Nom" placeholderTextColor="#8b8b8b" value={deleteNom} onChangeText={setDeleteNom} />
              <ActionButton label="Supprimer projet" onPress={supprimerProjet} />
            </View>
          </View>
          <Text style={styles.sectionTitle}>Contact :</Text>
          <View style={styles.separator} />
          <View style={styles.gmailSpace}>
            <Text style={styles.gmailTitle}>Gmail</Text>
            <Text style={styles.gmailLabel}>Libellé : Portfolio Contact</Text>
            <Pressable
              style={({ pressed }) => [styles.mailButton, pressed && styles.buttonPressed]}
              onPress={() => Linking.openURL(PORTFOLIO_CONTACT_MAIL_URL)}
            >
              <Text style={styles.mailButtonLabel}>Ouvrir le libellé Gmail</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={onPress}><Text style={styles.buttonLabel}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff"
  },
  page: {
    flexGrow: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    padding: 24
  },
  card: {
    width: "100%",
    maxWidth: 700,
    height: "100%",
    maxHeight: 900,
    borderWidth: 1,
    borderColor: "#535353",
    padding: 18,
    backgroundColor: "#ffffff"
  },
  title: {
    marginBottom: 36,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#0d0d0d"
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontStyle: "italic",
    color: "#151515"
  },
  separator: {
    height: 1,
    marginTop: 7,
    marginBottom: 16,
    backgroundColor: "#b2b2b2"
  },
  projectActions: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 17
  },
  addColumn: {
    height: 350,
    flex: 1.35,
    minWidth: 0,
    borderWidth: 1,
    borderColor: "#616161",
  },
  actionColumn: {
    flex: 1,
    justifyContent: "flex-end",
    borderWidth: 1,
    borderColor: "#616161",
    padding: 4
  },
  deleteColumn: {
    height: 350,
    flex: 1.35,
    minWidth: 0,
    borderWidth: 1,
    borderColor: "#616161",
  },
  input: {
    height: 70,
    paddingHorizontal: 7,
    fontSize: 11,
    color: "#202020"
  },
  button: {
    minHeight: 43,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0,
    backgroundColor: "#8a8a8a"
  },
  buttonPressed: {
    opacity: 0.72
  },
  buttonLabel: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff"
  },
  gmailSpace: {
    height: 350,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#6b9dd1"
  },
  gmailTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700"
  },
  gmailLabel: {
    color: "#ffffff",
    fontSize: 14
  },
  mailButton: {
    marginTop: 8,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ffffff",
    backgroundColor: "#ffffff"
  },
  mailButtonLabel: {
    color: "#27649e",
    fontSize: 12,
    fontWeight: "600"
  },
});
