import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const API_URL = "http://localhost:5000";
const PORTFOLIO_CONTACT_MAIL_URL = "https://mail.google.com/mail/u/0/#label/Portfolio%20Contact";

type ProjectPayload = {
  index: string;
  nom: string;
  description: string;
  tags: string[];
  lien?: string;
};

type GmailMessage = {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  unread: boolean;
};

export default function App() {
  const [addIndex, setAddIndex] = useState("");
  const [addNom, setAddNom] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [lien, setLien] = useState("");
  const [deleteIndex, setDeleteIndex] = useState("");
  const [deleteNom, setDeleteNom] = useState("");

  const [projets, setProjets] = useState<ProjectPayload[]>([]);

  // États pour Gmail OAuth & Messages
  const [gmailAuth, setGmailAuth] = useState(false);
  const [gmailEmail, setGmailEmail] = useState("");
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);
  const [loadingGmail, setLoadingGmail] = useState(false);

  const chargerProjets = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/projets`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setProjets(data);
        }
      }
    } catch {
      // Si l'API Flask est éteinte
    }
  }, []);

  const chargerGmail = useCallback(async () => {
    try {
      setLoadingGmail(true);
      const resStatus = await fetch(`${API_URL}/api/gmail/status`);
      if (resStatus.ok) {
        const dataStatus = await resStatus.json();
        setGmailAuth(dataStatus.authenticated);
        if (dataStatus.email) setGmailEmail(dataStatus.email);

        if (dataStatus.authenticated) {
          const resMsgs = await fetch(`${API_URL}/api/gmail/messages`);
          if (resMsgs.ok) {
            const dataMsgs = await resMsgs.json();
            if (Array.isArray(dataMsgs.messages)) {
              setGmailMessages(dataMsgs.messages);
            }
          }
        }
      }
    } catch {
      // Ignorer si hors ligne
    } finally {
      setLoadingGmail(false);
    }
  }, []);

  useEffect(() => {
    chargerProjets();
    chargerGmail();
    const interval = setInterval(() => {
      chargerProjets();
      chargerGmail();
    }, 4000);
    return () => clearInterval(interval);
  }, [chargerProjets, chargerGmail]);

  function seConnecterGoogle() {
    if (Platform.OS === "web") {
      window.location.href = `${API_URL}/auth/login`;
    } else {
      Linking.openURL(`${API_URL}/auth/login`);
    }
  }

  async function seDeconnecterGoogle() {
    try {
      await fetch(`${API_URL}/auth/logout`, { method: "POST" });
      setGmailAuth(false);
      setGmailMessages([]);
      setSelectedMessage(null);
    } catch {
      // Ignorer
    }
  }

  async function envoyer(path: string, body: ProjectPayload | Pick<ProjectPayload, "index" | "nom">) {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "La requête a échoué.");
    return data;
  }

  async function ajouterProjet() {
    if (!addIndex.trim() || !addNom.trim()) {
      return Alert.alert("Informations manquantes", "Renseignez au minimum l'index et le nom du projet.");
    }
    const parsedTags = tags
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);

    const nouveauProjet: ProjectPayload = {
      index: addIndex,
      nom: addNom,
      description,
      tags: parsedTags,
      lien,
    };
    try {
      const data = await envoyer("/api/projets", nouveauProjet);
      setProjets((prev) => [...prev, nouveauProjet]);
      Alert.alert("Projet ajouté", data.message ?? "Le projet a bien été ajouté.");
      setAddIndex("");
      setAddNom("");
      setDescription("");
      setTags("");
      setLien("");
      chargerProjets();
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  }

  async function supprimerProjet() {
    if (!deleteIndex.trim() || !deleteNom.trim()) {
      return Alert.alert("Informations manquantes", "Renseignez l'index et le nom du projet à supprimer.");
    }
    try {
      const data = await envoyer("/api/projetssupp", { index: deleteIndex, nom: deleteNom });
      setProjets((prev) => prev.filter((p) => !(p.nom === deleteNom && p.index === deleteIndex)));
      Alert.alert("Projet supprimé", data.message ?? "Le projet a bien été supprimé.");
      setDeleteIndex("");
      setDeleteNom("");
      chargerProjets();
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {/* CARTE GAUCHE : ADMINISTRATION */}
        <View style={styles.card}>
          <Text style={styles.title}>ADMINISTRATION</Text>
          <Text style={styles.sectionTitle}>Projets :</Text>
          <View style={styles.separator} />
          <View style={styles.projectActions}>
            <View style={styles.addColumn}>
              <TextInput
                style={styles.input}
                placeholder="Index"
                placeholderTextColor="#8b8b8b"
                value={addIndex}
                onChangeText={setAddIndex}
              />
              <TextInput
                style={styles.input}
                placeholder="Nom"
                placeholderTextColor="#8b8b8b"
                value={addNom}
                onChangeText={setAddNom}
              />
              <TextInput
                style={styles.input}
                placeholder="Description"
                placeholderTextColor="#8b8b8b"
                value={description}
                onChangeText={setDescription}
              />
              <TextInput
                style={styles.input}
                placeholder="Tags (séparés par un espace)"
                placeholderTextColor="#8b8b8b"
                value={tags}
                onChangeText={setTags}
              />
              <TextInput
                style={styles.input}
                placeholder="Lien"
                placeholderTextColor="#8b8b8b"
                value={lien}
                onChangeText={setLien}
              />
              <ActionButton label="Ajouter projet" onPress={ajouterProjet} />
            </View>
            <View style={styles.actionColumn}>
              <ActionButton
                label="Modifier projet"
                onPress={() =>
                  Alert.alert("Modification", "La route de modification du projet n'est pas encore disponible.")
                }
              />
            </View>
            <View style={styles.deleteColumn}>
              <TextInput
                style={styles.input}
                placeholder="Index"
                placeholderTextColor="#8b8b8b"
                value={deleteIndex}
                onChangeText={setDeleteIndex}
              />
              <TextInput
                style={styles.input}
                placeholder="Nom"
                placeholderTextColor="#8b8b8b"
                value={deleteNom}
                onChangeText={setDeleteNom}
              />
              <ActionButton label="Supprimer projet" onPress={supprimerProjet} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Contact (Gmail) :</Text>
          <View style={styles.separator} />

          {!gmailAuth ? (
            /* ÉTAT NON CONNECTÉ : BOUTON DE CONNEXION GOOGLE OAUTH */
            <View style={styles.gmailConnectCard}>
              <Text style={styles.gmailConnectTitle}>Gmail • Portfolio Contact</Text>
              <Text style={styles.gmailConnectSub}>
                Connectez votre compte Google pour récupérer et lire vos messages directement ici.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.googleLoginBtn, pressed && styles.buttonPressed]}
                onPress={seConnecterGoogle}
              >
                <Text style={styles.googleLoginBtnText}>🔑 Se connecter avec Google</Text>
              </Pressable>
              <Pressable onPress={() => Linking.openURL(PORTFOLIO_CONTACT_MAIL_URL)}>
                <Text style={styles.gmailExternalLink}>Ou ouvrir dans l'onglet Gmail ↗</Text>
              </Pressable>
            </View>
          ) : selectedMessage ? (
            /* ÉTAT CONNECTÉ : DÉTAIL D'UN EMAIL SÉLECTIONNÉ */
            <View style={styles.emailDetailContainer}>
              <View style={styles.emailDetailHeader}>
                <Pressable
                  style={({ pressed }) => [styles.backBtn, pressed && styles.buttonPressed]}
                  onPress={() => setSelectedMessage(null)}
                >
                  <Text style={styles.backBtnText}>← Retour</Text>
                </Pressable>
                <Text style={styles.emailDetailSubject} numberOfLines={1}>
                  {selectedMessage.subject}
                </Text>
                <Pressable
                  onPress={() => Linking.openURL(`https://mail.google.com/mail/u/0/#inbox/${selectedMessage.id}`)}
                >
                  <Text style={styles.openInGmailText}>Gmail ↗</Text>
                </Pressable>
              </View>

              <View style={styles.emailMetaRow}>
                <Text style={styles.emailFromText} numberOfLines={1}>
                  De : <Text style={{ fontWeight: "700" }}>{selectedMessage.from}</Text>
                </Text>
                <Text style={styles.emailDateText}>{selectedMessage.date ? selectedMessage.date.split(" ").slice(0, 4).join(" ") : ""}</Text>
              </View>

              <ScrollView style={styles.emailBodyScroll} nestedScrollEnabled>
                <Text style={styles.emailBodyText}>{selectedMessage.body || selectedMessage.snippet}</Text>
              </ScrollView>
            </View>
          ) : (
            /* ÉTAT CONNECTÉ : LISTE DES EMAILS */
            <View style={styles.gmailInboxContainer}>
              <View style={styles.inboxHeader}>
                <View style={styles.inboxHeaderLeft}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.inboxUserEmail} numberOfLines={1}>
                    {gmailEmail || "Connecté"}
                  </Text>
                  <Text style={styles.inboxCount}>({gmailMessages.length} msg)</Text>
                </View>
                <View style={styles.inboxHeaderActions}>
                  <Pressable
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.buttonPressed]}
                    onPress={chargerGmail}
                  >
                    <Text style={styles.iconBtnText}>🔄</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.buttonPressed]}
                    onPress={seDeconnecterGoogle}
                  >
                    <Text style={styles.iconBtnText}>Déconnexion</Text>
                  </Pressable>
                </View>
              </View>

              <ScrollView style={styles.messagesListScroll} nestedScrollEnabled>
                {gmailMessages.length === 0 ? (
                  <View style={styles.emptyInbox}>
                    <Text style={styles.emptyInboxText}>
                      {loadingGmail ? "Chargement des emails..." : "Aucun message trouvé pour ce libellé."}
                    </Text>
                  </View>
                ) : (
                  gmailMessages.map((msg) => (
                    <Pressable
                      key={msg.id}
                      style={({ pressed }) => [
                        styles.messageCard,
                        msg.unread && styles.unreadMessageCard,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => setSelectedMessage(msg)}
                    >
                      <View style={styles.messageCardHeader}>
                        <View style={styles.messageFromWrap}>
                          {msg.unread && <View style={styles.unreadDot} />}
                          <Text style={styles.messageFrom} numberOfLines={1}>
                            {msg.from}
                          </Text>
                        </View>
                        <Text style={styles.messageDate}>
                          {msg.date ? msg.date.split(" ").slice(0, 4).join(" ") : ""}
                        </Text>
                      </View>
                      <Text style={styles.messageSubject} numberOfLines={1}>
                        {msg.subject}
                      </Text>
                      <Text style={styles.messageSnippet} numberOfLines={2}>
                        {msg.snippet}
                      </Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* CARTE DROITE : STOCK JSON LIVE */}
        <View style={styles.card}>
          <Text style={styles.title}>Stock JSON live</Text>
          <ScrollView style={styles.jsonScrollView} nestedScrollEnabled>
            <Text style={styles.jsonText}>{JSON.stringify(projets, null, 4)}</Text>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={onPress}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  page: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    flex: 1,
    width: "100%",
    maxWidth: 700,
    height: "100%",
    maxHeight: 900,
    borderWidth: 1,
    borderColor: "#535353",
    padding: 18,
    backgroundColor: "#ffffff",
    marginHorizontal: 12,
  },
  title: {
    marginBottom: 36,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#0d0d0d",
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontStyle: "italic",
    color: "#151515",
  },
  separator: {
    height: 1,
    marginTop: 7,
    marginBottom: 16,
    backgroundColor: "#b2b2b2",
  },
  projectActions: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 17,
  },
  addColumn: {
    height: 350,
    flex: 1.35,
    minWidth: 0,
    borderWidth: 1,
    borderColor: "#616161",
  },
  actionColumn: {
    height: 350,
    flex: 1.35,
    minWidth: 0,
    borderWidth: 1,
    borderColor: "#616161",
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
    color: "#202020",
  },
  button: {
    minHeight: 43,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0,
    backgroundColor: "#8a8a8a",
  },
  buttonPressed: {
    opacity: 0.72,
  },
  buttonLabel: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
  },

  /* Section Connexion Gmail */
  gmailConnectCard: {
    height: 350,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#6b9dd1",
    borderRadius: 4,
    gap: 12,
  },
  gmailConnectTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  gmailConnectSub: {
    color: "#e8f1fb",
    fontSize: 12,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 16,
  },
  googleLoginBtn: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "#ffffff",
    borderRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleLoginBtnText: {
    color: "#27649e",
    fontSize: 13,
    fontWeight: "700",
  },
  gmailExternalLink: {
    marginTop: 4,
    color: "#ffffff",
    fontSize: 11,
    textDecorationLine: "underline",
  },

  /* Section Boîte de réception Gmail */
  gmailInboxContainer: {
    height: 350,
    borderWidth: 1,
    borderColor: "#616161",
    backgroundColor: "#fbfbfb",
    display: "flex",
    flexDirection: "column",
  },
  inboxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#6b9dd1",
  },
  inboxHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  inboxUserEmail: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 160,
  },
  inboxCount: {
    color: "#e8f1fb",
    fontSize: 11,
  },
  inboxHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#ffffff",
    borderRadius: 3,
  },
  iconBtnText: {
    fontSize: 11,
    color: "#27649e",
    fontWeight: "600",
  },
  messagesListScroll: {
    flex: 1,
    padding: 6,
  },
  emptyInbox: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyInboxText: {
    color: "#888888",
    fontSize: 12,
    textAlign: "center",
  },
  messageCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 8,
    borderRadius: 3,
    marginBottom: 6,
  },
  unreadMessageCard: {
    borderColor: "#93c5fd",
    backgroundColor: "#f0f7ff",
  },
  messageCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  messageFromWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3b82f6",
  },
  messageFrom: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1e293b",
  },
  messageDate: {
    fontSize: 9,
    color: "#94a3b8",
  },
  messageSubject: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 2,
  },
  messageSnippet: {
    fontSize: 10,
    color: "#64748b",
    lineHeight: 14,
  },

  /* Section Détail d'un message */
  emailDetailContainer: {
    height: 350,
    borderWidth: 1,
    borderColor: "#616161",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
  },
  emailDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#6b9dd1",
    gap: 8,
  },
  backBtn: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  backBtnText: {
    color: "#27649e",
    fontSize: 11,
    fontWeight: "700",
  },
  emailDetailSubject: {
    flex: 1,
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  openInGmailText: {
    color: "#e8f1fb",
    fontSize: 11,
    textDecorationLine: "underline",
  },
  emailMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  emailFromText: {
    fontSize: 11,
    color: "#334155",
    flex: 1,
  },
  emailDateText: {
    fontSize: 10,
    color: "#94a3b8",
  },
  emailBodyScroll: {
    flex: 1,
    padding: 10,
  },
  emailBodyText: {
    fontSize: 11,
    color: "#1e293b",
    lineHeight: 17,
  },

  /* Section JSON Live */
  jsonScrollView: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#616161",
    padding: 12,
    backgroundColor: "#fbfbfb",
  },
  jsonText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#1a1a1a",
    lineHeight: 18,
  },
});
